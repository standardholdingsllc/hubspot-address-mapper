# HubSpot Address Mapper - Web Version

A modern web application for mapping addresses to company information in Excel files. This is a cloud-based version of the original Electron application, designed to run on Vercel.

## Features

- **File Upload**: Drag & drop or click to upload Excel files (.xlsx, .xls)
- **User Filtering**: Automatically remove test/demo accounts during upload
- **Address Mapping**: Automatically map addresses to company information
- **Mapping Management**: Add new address mappings through the web interface
- **Advanced Search**: Dedicated search pages with table and JSON views
- **Exclusion Management**: Add/remove usernames from the exclusion list
- **Excel Processing**: Add Company, Company Name, and Lifestyle Stage columns
- **Download Results**: Download processed Excel files
- **Modern UI**: Clean, responsive design with progress tracking

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Local Development

1. Clone the repository
2. Navigate to the web-app directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Deployment to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to configure your deployment

## How It Works

1. **Upload**: Upload an Excel file containing an "AddressStreet" column
2. **Process**: The system matches addresses against the existing mapping database
3. **Download**: Get your processed file with three new columns:
   - Company (numerical ID)
   - Company Name (text)
   - Lifestyle Stage (set to "Worker" for matched addresses)

Unmatched rows are highlighted in orange for easy identification.

## File Requirements

- Excel files must contain an "AddressStreet" column
- Supported formats: .xlsx, .xls
- Maximum file size: 10MB

## API Endpoints

- `POST /api/upload` - Upload, validate, and filter Excel files
- `POST /api/process` - Process uploaded files with address mappings
- `GET /api/download` - Download processed files
- `GET /api/mappings` - Retrieve all address mappings
- `POST /api/mappings` - Add new address mappings
- `DELETE /api/mappings` - Delete existing mappings
- `GET /api/names` - Retrieve excluded usernames
- `POST /api/names` - Add username to exclusion list
- `DELETE /api/names` - Remove username from exclusion list
- `POST /api/filter-users` - Filter users from Excel data

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **File Processing**: xlsx library
- **Deployment**: Vercel
- **File Upload**: Formidable

## Environment Variables

No environment variables are required for basic functionality. All mapping data is stored in `/data/address_mappings.json`.

## Contributing

This application was converted from an Electron desktop app to a web application for cloud deployment. The core functionality remains the same while adding modern web features like drag & drop uploads and responsive design.

## License

MIT 