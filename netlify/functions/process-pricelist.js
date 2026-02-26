import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler = async (event) => {
  // ── Method guard ──────────────────────────────────────────────────────────
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // ── 1. Parse request body ───────────────────────────────────────────────
    let fileUrl, fileName;
    try {
      ({ fileUrl, fileName } = JSON.parse(event.body ?? '{}'));
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    if (!fileUrl || typeof fileUrl !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '`fileUrl` is required and must be a string' }),
      };
    }

    if (!fileName || typeof fileName !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '`fileName` is required and must be a string' }),
      };
    }

    // SSRF guard: only allow HTTPS URLs pointing to the configured Supabase project
    const supabaseHost = new URL(process.env.VITE_SUPABASE_URL).hostname;
    const targetHost = new URL(fileUrl).hostname;
    if (!targetHost.endsWith(supabaseHost)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'fileUrl must point to your Supabase Storage bucket' }),
      };
    }

    // ── 2. Derive provider name from fileName ───────────────────────────────
    // Strip leading timestamp prefix ("1740000000000_") and extension
    const fileNameSinExtension = fileName
      .replace(/^\d+_/, '')   // strip leading timestamp prefix
      .replace(/\.[^.]+$/, '') // strip extension
      .replace(/_/g, ' ')
      .trim() || 'Shamy Repuestos';

    // ── 3. Download file ────────────────────────────────────────────────────
    console.log('[process-pricelist] Downloading file from', fileUrl.slice(0, 80) + '...');
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file (${fileResponse.status}): ${fileResponse.statusText}`);
    }

    const contentLength = Number(fileResponse.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FILE_BYTES) {
      return {
        statusCode: 413,
        body: JSON.stringify({ error: 'El archivo supera el límite de 50 MB' }),
      };
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[process-pricelist] File buffered:', buffer.length, 'bytes');

    // ── 4. Parse workbook ───────────────────────────────────────────────────
    // Supports .xlsx, .xls, .csv
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('[process-pricelist] Sheets found:', workbook.SheetNames);

    // ── 5. Extract records from every sheet ────────────────────────────────
    // Column indices are discovered dynamically from the header row so that
    // hidden columns or layout shifts in the supplier's Excel don't break
    // extraction. Fallback values match the historically expected layout.
    const extractedRecords = [];

    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      // ── Phase 1: Dynamic column-index detection ───────────────────────────
      // Scan the first 30 rows for the header row, then map column indices
      // dynamically so hidden or extra columns don't break extraction.
      let headerRowIndex = -1;
      let idxMarca = 0, idxModelo = 1, idxUsd = 2, idxArs = 3, idxTransf = 4, idxCalidad = 5;

      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        if (!Array.isArray(rows[i])) continue;
        const rowStr = rows[i].join(' ').toUpperCase();
        if (rowStr.includes('PRECIO PESO') || rowStr.includes('VALOR')) {
          headerRowIndex = i;
          // Array.from fills sparse holes before mapping, so findIndex never receives undefined
          const headers = Array.from(rows[i], h => String(h ?? '').toUpperCase().trim());

          const findIdx = (fn) => { const idx = headers.findIndex(fn); return idx !== -1 ? idx : undefined; };
          idxMarca   = findIdx(h => h.includes('MARCA'))                               ?? idxMarca;
          idxModelo  = findIdx(h => h.includes('MODELO'))                              ?? idxModelo;
          idxUsd     = findIdx(h => h.includes('DOLAR') || h.includes('DÓLAR'))       ?? idxUsd;
          idxArs     = findIdx(h => h.includes('PRECIO PESO') || h.includes('PESO'))  ?? idxArs;
          idxTransf  = findIdx(h => h.includes('TRANSFERENCIA'))                       ?? idxTransf;
          idxCalidad = findIdx(h => h.includes('CALIDAD'))                             ?? idxCalidad;

          console.log(`[process-pricelist] Header row at index ${headerRowIndex} in sheet "${sheetName}"`);
          console.log(`[process-pricelist] Column map — marca:${idxMarca} modelo:${idxModelo} usd:${idxUsd} ars:${idxArs} transf:${idxTransf} calidad:${idxCalidad}`);
          break;
        }
      }

      // ── Phase 2: State machine + data loop ────────────────────────────────
      // Start processing after the detected header row (or from row 0 as fallback).
      let currentPartName = 'Módulo';
      const categoryKeywords = ['TOUCH', 'LCD', 'VIDRIO', 'TABLET', 'BATERIA', 'PIN', 'TAPA'];

      const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;

        // Detect section-header rows using dynamic indices:
        // text in the brand column but no price in the peso column → it's a title.
        if (row[idxMarca] && !row[idxArs]) {
          const headerText = String(row[idxMarca]).trim().toUpperCase();
          if (categoryKeywords.some(kw => headerText.includes(kw))) {
            currentPartName = headerText; // e.g. "VIDRIOS DE MÓDULOS", "TOUCH"
          }
          continue; // Title row — not a product row
        }

        // ── Phase 3: Strict filter and safe field extraction ──────────────
        if (!row[idxArs] || isNaN(parseInt(String(row[idxArs]).replace(/\D/g, ''), 10))) continue;

        // PRECIO PESO — integer
        const price = parseInt(String(row[idxArs]).replace(/\D/g, ''), 10) || null;

        // VALOR DOLAR — may have decimals
        let price_usd = null;
        if (idxUsd !== -1 && row[idxUsd] != null) {
          const parsed = parseFloat(String(row[idxUsd]).replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) price_usd = parsed;
        }

        // TRANSFERENCIA — integer
        let price_transfer = null;
        if (idxTransf !== -1 && row[idxTransf] != null) {
          const parsed = parseInt(String(row[idxTransf]).replace(/\D/g, ''), 10);
          if (!isNaN(parsed)) price_transfer = parsed;
        }

        const brand   = row[idxMarca]  ? String(row[idxMarca]).trim()  : 'Desconocido';
        const model   = row[idxModelo] ? String(row[idxModelo]).trim() : 'Desconocido';
        const quality = (idxCalidad !== -1 && row[idxCalidad])
          ? String(row[idxCalidad]).trim()
          : 'Estándar';

        extractedRecords.push({
          provider:      fileNameSinExtension,
          brand,
          model,
          part_name:     currentPartName,
          quality,
          price_usd,
          price,
          price_transfer,
          currency:      'ARS',
        });
      }
    }

    console.log('[process-pricelist] Extracted records:', extractedRecords.length);

    if (extractedRecords.length === 0) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          error:
            'No se encontraron filas con precios válidos en el archivo. ' +
            'Verificá que la columna D (índice 3) contenga los precios en pesos.',
        }),
      };
    }

    // ── 6. Connect to Supabase with service role (bypasses RLS) ────────────
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    // ── 7. Delete previous records for this provider to avoid duplicates ───
    console.log('[process-pricelist] Deleting previous records for provider:', fileNameSinExtension);
    const { error: deleteError } = await supabase
      .from('supplier_prices')
      .delete()
      .eq('provider', fileNameSinExtension);

    if (deleteError) {
      throw new Error(`Error al limpiar registros anteriores: ${deleteError.message}`);
    }

    // ── 8. Bulk insert ──────────────────────────────────────────────────────
    console.log('[process-pricelist] Inserting', extractedRecords.length, 'rows...');
    const { error: insertError } = await supabase
      .from('supplier_prices')
      .insert(extractedRecords);

    if (insertError) {
      throw new Error(`Error al insertar registros: ${insertError.message}`);
    }

    // ── 9. Success ───────────────────────────────────────────────────────────
    console.log('[process-pricelist] Done. Inserted', extractedRecords.length, 'rows for', fileNameSinExtension);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: extractedRecords.length,
        provider: fileNameSinExtension,
      }),
    };
  } catch (err) {
    console.error('[process-pricelist] Unhandled error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message ?? 'Internal Server Error' }),
    };
  }
};
