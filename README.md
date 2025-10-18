# Amazon Book Organizer

A web-based tool for organizing and managing your Amazon book library with advanced filtering, sorting, and organization features.

## Features

- Import and organize your Amazon book library
- Advanced filtering by author, series, and reading status
- Sort books by various criteria
- Export organized data
- Client-side processing with IndexedDB storage

## Technology Stack

- React (via CDN)
- Tailwind CSS
- IndexedDB for local storage
- Vanilla JavaScript

## Getting Started

### Running the Application

Due to browser security restrictions (CORS policy), you need to run a local web server to use the application:

1. **Start a local HTTP server** in the project directory:
   ```bash
   python -m http.server 8000
   ```
   Or with Python 2:
   ```bash
   python -m SimpleHTTPServer 8000
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:8000/amazon-organizer.html
   ```

3. **Load your library**: Click the status indicator at the top to load your Amazon library JSON file

4. **Start organizing**: Drag books into custom columns to organize your collection!

### Why a local server?

Browsers block JavaScript from loading local files (like your library JSON) when opening HTML files directly (`file://` protocol). Running a local HTTP server (`http://localhost`) allows the application to access these files securely.

## Files

- `amazon-organizer.html` - Main application interface
- `console-fetcher.js` - Data fetching utility
- `amazon-book-organizer.code-workspace` - VS Code workspace configuration

## Development with Claude

This project uses **Claude Skills** to maintain development workflow consistency across sessions. If you're working with Claude on this project:

### Required Skills

Two skill files must be uploaded to Claude and enabled for this project:

1. **software-development-ground-rules** (`SKILL-Development-Ground-Rules.zip`)
   - Core development workflow rules
   - Version management, approval workflow, git patterns
   - **Enable globally** for all development projects

2. **amazon-book-organizer-project** (`SKILL-Amazon-Book-Organizer.zip`)
   - Project-specific context and architecture patterns
   - Common pitfalls and solutions
   - **Enable per project** when working on Amazon Book Organizer

### How to Enable Skills

1. Upload both `.zip` files to Claude's Skills interface (Settings → Skills)
2. In each conversation, enable the relevant skills:
   - Always enable: `software-development-ground-rules`
   - Enable for this project: `amazon-book-organizer-project`

**Important**: Skills must be manually enabled for each new conversation. Forgetting to enable them will result in inconsistent development patterns.

### Updating Skills

When the source files (`SKILL-*.md`) are modified, the zip files are automatically regenerated:

1. Claude runs the build scripts automatically using PowerShell:
   ```bash
   build-skill-ground-rules.bat
   build-skill-organizer.bat
   ```

2. Developer uploads the new `.zip` files to Claude Skills interface:
   - Delete the old skill
   - Upload the new `.zip` file (no "update" option exists)

### Key Documents

- `CHANGELOG.md` - Contains Technical Notes documenting approaches that failed (prevents revisiting blind alleys)
- `TODO.md` - Current tasks and pending improvements
- `NOTES.md` - Session continuity file for tabled items and work-in-progress context
- `SKILL-Development-Ground-Rules.md` - Source for the ground rules skill
- `SKILL-Amazon-Book-Organizer.md` - Source for the project skill
- `build-skill-*.bat` - Scripts to regenerate Skills zip files

## Version

**Project Version: v3.1.2**

This is the project-level version used for git tags. Individual code files may have their own internal versions (e.g., `APP_VERSION` in amazon-organizer.html).

## License

MIT License - see LICENSE file for details

## Author

Ron-L
