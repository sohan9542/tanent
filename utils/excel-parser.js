import * as XLSX from 'xlsx'
import Papa from 'papaparse'

/**
 * Parse Excel or CSV file and return rows
 */
export async function parseTenantFile(file) {
  const fileExtension = file.name.split('.').pop().toLowerCase()
  const buffer = await file.arrayBuffer()

  if (fileExtension === 'csv') {
    return parseCSV(buffer)
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    return parseExcel(buffer)
  } else {
    throw new Error('Unsupported file format. Please use .csv or .xlsx')
  }
}

/**
 * Parse CSV file
 */
function parseCSV(buffer) {
  const text = new TextDecoder().decode(buffer)
  
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data)
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * Parse Excel file
 */
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet)
  
  return data
}

/**
 * Normalize column names (handle variations)
 */
export function normalizeColumnName(name) {
  if (!name) return null
  
  const normalized = name.trim().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  
  // Map common variations
  const mappings = {
    'tenant_id': 'tenantId',
    'tenantid': 'tenantId',
    'id': 'tenantId',
    'first_name': 'firstName',
    'firstname': 'firstName',
    'fname': 'firstName',
    'last_name': 'lastName',
    'lastname': 'lastName',
    'lname': 'lastName',
    'email': 'email',
    'phone': 'phone',
    'building_name': 'buildingName',
    'buildingname': 'buildingName',
    'building': 'buildingName',
    'unit_number': 'unitNumber',
    'unitnumber': 'unitNumber',
    'unit': 'unitNumber',
    'unit_no': 'unitNumber'
  }
  
  return mappings[normalized] || normalized
}

/**
 * Normalize row data to expected format
 */
export function normalizeRow(row) {
  const normalized = {}
  
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key)
    if (normalizedKey && value !== null && value !== undefined) {
      normalized[normalizedKey] = String(value).trim()
    }
  }
  
  return normalized
}


