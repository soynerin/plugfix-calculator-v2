import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// Helper: derive a human-readable provider name from a storage path.
// e.g. "1740000000000_Shamy_Repuestos.xlsx" → "Shamy Repuestos"
// ---------------------------------------------------------------------------
function providerFromUrl(fileUrl) {
  const urlPath = new URL(fileUrl).pathname;
  const rawFilename = decodeURIComponent(urlPath.split('/').pop() ?? '');
  const name = rawFilename
    .replace(/^\d+_/, '')   // strip leading timestamp prefix
    .replace(/\.[^.]+$/, '') // strip extension
    .replace(/_/g, ' ')
    .trim();
  return name || 'Shamy Repuestos';
}

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
    let fileUrl;
    try {
      ({ fileUrl } = JSON.parse(event.body ?? '{}'));
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

    // SSRF guard: only allow HTTPS URLs pointing to the configured Supabase project
    const supabaseHost = new URL(process.env.VITE_SUPABASE_URL).hostname;
    const targetHost = new URL(fileUrl).hostname;
    if (!targetHost.endsWith(supabaseHost)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'fileUrl must point to your Supabase Storage bucket' }),
      };
    }

    // ── 2. Download file as ArrayBuffer ────────────────────────────────────
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

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    console.log('[process-pricelist] File buffered:', fileBuffer.length, 'bytes');

    // ── 3. Parse workbook (supports .xlsx, .xls, .csv) ─────────────────────
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    console.log('[process-pricelist] Sheets found:', workbook.SheetNames);

    // ── 4. Extract records from every sheet ────────────────────────────────
    // Expected column layout (0-indexed):
    //   [0] MARCA  [1] MODELO  [2] VALOR DOLAR  [3] PRECIO PESO  [4] TRANSFERENCIA  [5] CALIDAD
    const providerName = providerFromUrl(fileUrl);
    const extractedRecords = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

      for (const row of data) {
        // Skip rows that don't have a valid positive integer at col 3 (Precio Peso).
        // This automatically filters out header rows and empty / total rows.
        const rawPrice = row[3];
        const price = parseInt(rawPrice, 10);
        if (!rawPrice || isNaN(price) || price <= 0) continue;

        extractedRecords.push({
          provider: providerName,
          brand:     row[0] ? String(row[0]).trim() : 'Desconocido',
          model:     row[1] ? String(row[1]).trim() : 'Desconocido',
          part_name: 'Repuesto',
          quality:   row[5] ? String(row[5]).trim() : 'Estándar',
          price,
        });
      }
    }

    console.log('[process-pricelist] Extracted records:', extractedRecords.length);

    if (extractedRecords.length === 0) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          error: 'No se encontraron filas con precios válidos en el archivo. Verificá que la columna D (índice 3) contenga los precios en pesos.',
        }),
      };
    }

    // ── 5. Delete old records for this provider, then bulk insert ──────────
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    console.log('[process-pricelist] Deleting previous records for provider:', providerName);
    const { error: deleteError } = await supabase
      .from('supplier_prices')
      .delete()
      .eq('provider', providerName);

    if (deleteError) {
      throw new Error(`Error al limpiar registros anteriores: ${deleteError.message}`);
    }

    console.log('[process-pricelist] Inserting', extractedRecords.length, 'rows...');
    const { error: insertError } = await supabase
      .from('supplier_prices')
      .insert(extractedRecords);

    if (insertError) {
      throw new Error(`Error al insertar registros: ${insertError.message}`);
    }

    // ── 6. Success ───────────────────────────────────────────────────────────
    console.log('[process-pricelist] Done. Inserted', extractedRecords.length, 'rows for', providerName);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, count: extractedRecords.length, provider: providerName }),
    };
  } catch (err) {
    console.error('process-pricelist unhandled error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message ?? 'Internal Server Error' }),
    };
  }
};
