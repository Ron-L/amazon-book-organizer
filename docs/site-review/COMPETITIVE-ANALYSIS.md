# Ebook Library Management Tools - Comprehensive Comparison

## Overview

A comparison of ReaderWrangler with other ebook library management tools found on GitHub.

---

## Basic Information

| Project | Type | Platform | License | Status |
|---------|------|----------|---------|--------|
| **ReaderWrangler** | Browser-based SPA | Web (any browser) | MIT | Active (v3.4.0) |
| **organize-ebooks** | CLI Python tool | CLI (Docker/native) | GPL v3 | Mature |
| **ebook-tools** | CLI Shell scripts | CLI (Docker/native) | GPL v3 | Established |
| **Citadel** | Desktop application | MacOS primarily | Not specified | Early Beta |
| **BookLore** | Self-hosted web server | Docker | Not specified | Active |
| **BookHeaven** | Self-hosted web server | Docker | Not specified | Active |

---

## Primary Focus & Use Cases

| Project | Primary Focus | Best For |
|---------|---------------|----------|
| **ReaderWrangler** | Visual organization & rediscovery of Amazon Kindle library | Kindle users who want to organize their existing Amazon library without touching files |
| **organize-ebooks** | Automatic file renaming and organization by ISBN | People with thousands of poorly-named ebook files needing bulk organization |
| **ebook-tools** | Automatic file renaming and organization by ISBN | Same as organize-ebooks (this is the original shell version) |
| **Citadel** | Fast, modern Calibre alternative | Users frustrated with Calibre's performance/UX who want a better desktop experience |
| **BookLore** | Complete self-hosted library with reader | Users wanting their own "ebook server" with multi-user support and device sync |
| **BookHeaven** | Simple self-hosted library with reading app | Users wanting a lightweight personal library server with companion reader app |

---

## Installation & Setup

| Project | Installation Complexity | Setup Requirements |
|---------|------------------------|-------------------|
| **ReaderWrangler** | Very Simple (bookmarklet + web page) | Just visit webpage and install bookmarklet |
| **organize-ebooks** | Medium (pip or Docker) | Python, Calibre, Tesseract, 7zip, various converters |
| **ebook-tools** | Medium (native scripts or Docker) | Bash, Calibre, Tesseract, 7zip, poppler, catdoc, DjVuLibre |
| **Citadel** | Simple (desktop app) | Bun, Node, Rust (for development) |
| **BookLore** | Medium-High (Docker + database) | Docker, PostgreSQL |
| **BookHeaven** | Medium (Docker) | Docker, .NET runtime |

---

## Data Sources & Privacy

| Project | Data Source | Privacy Model | Data Storage |
|---------|-------------|---------------|--------------|
| **ReaderWrangler** | Amazon Kindle library via bookmarklet | Client-side only, no server uploads | Browser IndexedDB |
| **organize-ebooks** | Local ebook files on filesystem | Local processing only | Filesystem (renamed files) |
| **ebook-tools** | Local ebook files on filesystem | Local processing only | Filesystem (renamed files) |
| **Citadel** | Calibre library files | Local processing only | Calibre library format |
| **BookLore** | Local ebook files uploaded to server | Self-hosted (you control the server) | PostgreSQL database |
| **BookHeaven** | Local ebook files uploaded to server | Self-hosted (you control the server) | Filesystem with metadata |

---

## File & Format Support

| Project | File Formats | OCR Support | Corruption Detection |
|---------|--------------|-------------|---------------------|
| **ReaderWrangler** | Amazon formats (metadata only, no files) | No | No |
| **organize-ebooks** | All major formats + archives | Yes (Tesseract) | Yes (7z, pdfinfo) |
| **ebook-tools** | All major formats + archives | Yes (Tesseract) | Yes (7z, pdfinfo) |
| **Citadel** | Calibre-supported formats | No | No |
| **BookLore** | EPUB, PDF, CBZ, CBR | No | No |
| **BookHeaven** | EPUB, PDF only | No | No |

---

## Organization Features

| Project | Custom Collections | Drag & Drop | Search/Filter | Smart Collections |
|---------|-------------------|-------------|---------------|-------------------|
| **ReaderWrangler** | Yes (custom columns) | Yes | Yes (author, series, genre, status) | No |
| **organize-ebooks** | No (output folders only) | No | No (CLI tool) | No |
| **ebook-tools** | No (output folders only) | No | No (CLI tool) | No |
| **Citadel** | Yes (Calibre-compatible) | Likely | Yes | Unknown |
| **BookLore** | Yes (shelves) | Likely | Yes (powerful filters) | Yes (Magic Shelves) |
| **BookHeaven** | Yes (tags, series) | Likely | Yes | No |

---

## Metadata & ISBN Features

| Project | ISBN Extraction | Metadata Fetching | Sources |
|---------|----------------|-------------------|---------|
| **ReaderWrangler** | No | From Amazon (via bookmarklet) | Amazon only |
| **organize-ebooks** | Yes (advanced, with OCR) | Yes | Goodreads, Amazon, Google Books, ISBNDB, WorldCat, OZON |
| **ebook-tools** | Yes (advanced, with OCR) | Yes | Goodreads, Amazon, Google Books, ISBNDB, WorldCat, OZON |
| **Citadel** | No | Yes | Calibre metadata sources |
| **BookLore** | No | Yes | Goodreads, Amazon, Google Books, Hardcover |
| **BookHeaven** | No | Yes | Internet sources (not specified) |

---

## Reading & Tracking Features

| Project | Built-in Reader | Reading Progress | Device Sync | OPDS |
|---------|----------------|------------------|-------------|------|
| **ReaderWrangler** | No (links to Amazon) | Yes (from Kindle) | Via Amazon | No |
| **organize-ebooks** | No | No | No | No |
| **ebook-tools** | No | No | No | No |
| **Citadel** | No (opens external apps) | Unknown | No | Unknown |
| **BookLore** | Yes (EPUB, PDF, comics) | Yes (with KOReader) | Yes (Kobo, KOReader) | Yes |
| **BookHeaven** | No (client app required) | Yes | Via client app | Yes |

---

## Multi-User & Sharing

| Project | Multi-User | User Permissions | Sharing Features |
|---------|-----------|------------------|------------------|
| **ReaderWrangler** | No | N/A | Export JSON for backup |
| **organize-ebooks** | No | N/A | File organization only |
| **ebook-tools** | No | N/A | File organization only |
| **Citadel** | No | N/A | Unknown |
| **BookLore** | Yes | Yes (granular) | Email sharing, community reviews |
| **BookHeaven** | Yes (profiles) | Yes | Font sharing to devices |

---

## Advanced Features Comparison

### ReaderWrangler
- Multi-select with Ctrl/Shift for bulk operations
- Book details modal with cover, ratings, reviews
- Advanced filtering (author, series, genre, reading status)
- Drag-and-drop interface for organizing books
- Client-side processing (complete privacy)
- Export organization to JSON

### organize-ebooks & ebook-tools
- Progressive ISBN extraction (filename → metadata → content → OCR)
- Customizable filename templates
- Pamphlet detection and separation
- Archive extraction and recursive processing
- Interactive manual organizer
- Batch processing of thousands of files
- Docker support for easy deployment

### Citadel
- Designed to be faster than Calibre
- Backwards compatible with Calibre libraries
- Modern, attractive UI
- Early development stage

### BookLore
- Magic Shelves (rule-based smart collections)
- BookDrop folder for automatic import
- Community reviews auto-fetch
- Kobo device integration with KEPUB conversion
- KOReader sync
- Customizable reading themes
- Private notes

### BookHeaven
- Auto-discovery for client apps
- Font management system
- Metadata editing with file persistence
- Simple, focused feature set
- Progress tracking across devices
- OPDS support

---

## Key Distinctions

### ReaderWrangler - UNIQUE POSITIONING

**What makes it different:**
1. **Only tool specifically for Amazon Kindle libraries** - All others work with local files
2. **Zero installation** - Just a bookmarklet and webpage
3. **100% client-side** - Maximum privacy, no server required
4. **Visual-first approach** - Drag-and-drop for non-technical users
5. **Focus on rediscovery** - Making forgotten books visible, not file management

**Complementary use case:** Users could use organize-ebooks for local file organization AND ReaderWrangler for their Kindle library organization.

### organize-ebooks & ebook-tools - File Organization Specialists

**Core strength:** Industrial-scale file organization and renaming
- Perfect for messy collections with thousands of poorly-named files
- ISBN extraction with OCR for accurate identification
- Automatic metadata fetching and file renaming
- Corruption detection and pamphlet filtering

**Use case:** "I have 10,000 ebook files named 'book1.pdf', 'unknown_author_2.epub', etc."

### Citadel - The Calibre Alternative

**Core strength:** Modern desktop UX for Calibre users
- Aims to replace Calibre with better performance
- Maintains Calibre compatibility
- Still in early development

### BookLore & BookHeaven - Self-Hosted Library Servers

**Core strength:** Complete ebook server solutions
- Multi-user support with permissions
- Device synchronization
- Built-in or companion readers
- OPDS support for connecting apps

**Difference:** BookLore is feature-rich (smart shelves, Kobo sync), BookHeaven is simpler and more focused.

---

## Market Positioning

### Target Audience Comparison

| Project | Target User |
|---------|-------------|
| **ReaderWrangler** | Kindle users frustrated with Amazon's lack of organization options |
| **organize-ebooks/ebook-tools** | Power users with large, messy local ebook collections |
| **Citadel** | Calibre users wanting better performance and UX |
| **BookLore** | Tech-savvy users wanting a self-hosted "Netflix for ebooks" |
| **BookHeaven** | Users wanting simple self-hosted library with basic features |

### Competitive Advantages

**ReaderWrangler's Unique Value:**
- Only solution for Amazon Kindle library organization
- Zero technical knowledge required
- No installation or server setup
- Complete privacy (client-side only)
- Instant access via web browser
- Free and open source

**Value Proposition:**
> "Finally organize your Amazon Kindle library the way Amazon should have let you do it in the first place - with zero installation and complete privacy."

---

## When to Use Each Tool

### Use ReaderWrangler when:
- You have a large Amazon Kindle library
- You can't find books you know you own
- You want to create reading lists or organize by themes
- You want zero-installation and maximum privacy
- You're a non-technical user

### Use organize-ebooks/ebook-tools when:
- You have thousands of poorly-named ebook files
- You need automatic file renaming based on ISBN
- You want to organize files in your filesystem
- You're comfortable with command-line tools
- You have scanned books that need OCR

### Use Citadel when:
- You're a Calibre user frustrated with its performance
- You want a modern desktop UI
- You're willing to use beta software
- You manage local ebook files

### Use BookLore when:
- You want a full-featured self-hosted library
- You need multi-user support
- You want smart collections and device sync
- You have Kobo devices
- You're comfortable with Docker/PostgreSQL

### Use BookHeaven when:
- You want a simple self-hosted solution
- You only need EPUB/PDF support
- You want a clean, minimal interface
- You prefer simpler setup than BookLore

---

## Technology Stack Comparison

| Project | Frontend | Backend | Database | Deployment |
|---------|----------|---------|----------|------------|
| **ReaderWrangler** | Vanilla JS | None (client-side) | IndexedDB | Static hosting |
| **organize-ebooks** | N/A (CLI) | Python | Filesystem | pip/Docker |
| **ebook-tools** | N/A (CLI) | Bash scripts | Filesystem | Native/Docker |
| **Citadel** | Web (Tauri) | Rust | Calibre DB | Desktop app |
| **BookLore** | Web (React/Next?) | Node.js | PostgreSQL | Docker Compose |
| **BookHeaven** | Blazor | .NET/C# | Filesystem | Docker |

---

## Conclusion

Each tool serves a distinct purpose:

- **ReaderWrangler**: Visual organization for Amazon Kindle libraries (unique niche)
- **organize-ebooks/ebook-tools**: Industrial file organization and renaming
- **Citadel**: Modern Calibre alternative
- **BookLore**: Feature-rich self-hosted library server
- **BookHeaven**: Simple self-hosted library server

ReaderWrangler is the **only tool** that:
1. Works with Amazon's ecosystem specifically
2. Requires absolutely no installation
3. Operates entirely client-side for privacy
4. Focuses on visual discovery rather than file management

This makes it complementary to rather than competitive with the other tools. A user might use organize-ebooks to organize their local files AND ReaderWrangler to organize their Kindle library.
