# Simple SQL Client

A modern, cross-platform SQL client desktop application for managing and querying multiple database systems. Built with **Electron**, **React 19**, and **TypeScript** for a fast, responsive user experience.

<div align="center">

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-required-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)

</div>

---

## ✨ Features

### Database Support
- **MySQL** - Connect to MySQL 5.7+ instances
- **PostgreSQL** - Full PostgreSQL support with modern connection handling
- **SQLite** - Local database management with easy file-based storage

### Core Capabilities
- 🔗 **Connection Management** - Save, edit, and manage multiple database connections
- 📊 **Data Browsing** - Intuitive table viewer with pagination and filtering
- 🗂️ **Schema Navigation** - Easy exploration of database structure and relationships
- 📝 **SQL Query Editor** - Execute custom SQL queries with results display
- ➕ **CRUD Operations** - Add, edit, and delete table rows directly from the UI
- 🔍 **Advanced Filtering** - Filter and search table data with multiple criteria
- 📋 **Table Management** - Create, rename, and delete tables with visual confirmation
- 🌙 **Dark/Light Theme** - Toggle between dark and light modes
- 🌍 **Internationalization** - Multi-language support (i18n ready)
- 💾 **Persistent Storage** - Save connection settings locally for quick access

### Developer Experience
- ⚡ **Vite** - Lightning-fast build and HMR during development
- 🎨 **shadcn/ui** - Beautiful, customizable UI components
- 📐 **TanStack Router** - Type-safe routing with React Router v2
- 🔄 **React Query** - Powerful data fetching and caching
- 🛡️ **TypeScript** - Full type safety throughout the application
- 📦 **Zod** - Runtime schema validation
- 🔧 **Biome** - Unified linting and formatting via Ultracite preset

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ (18+ recommended)
- **npm** 7+ or **yarn**
- A supported database (MySQL, PostgreSQL, or SQLite)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/electron-react-sqlclient.git
   cd electron-react-sqlclient
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

The application will launch in development mode with hot module reloading enabled.

---

## 📖 Development Guide

### Project Structure

```
electron-react-sqlclient/
├── src/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # Preload script for main window
│   ├── renderer.ts             # Renderer process setup
│   ├── app.tsx                 # Main React component
│   ├── actions/                # Redux-like action handlers
│   │   ├── app.ts
│   │   ├── language.ts
│   │   ├── shell.ts
│   │   ├── theme.ts
│   │   └── window.ts
│   ├── components/             # React components
│   │   ├── add-connection-dialog.tsx
│   │   ├── edit-connection-dialog.tsx
│   │   ├── connection-viewer/  # Connection-specific components
│   │   └── ui/                 # shadcn/ui components
│   ├── database/               # Database connection logic
│   │   ├── connection-manager.ts
│   │   └── connections/        # Database-specific adapters
│   │       ├── mysql.ts
│   │       ├── postgres.ts
│   │       └── sqlite.ts
│   ├── ipc/                    # IPC communication handlers
│   │   ├── router.ts           # IPC message routing
│   │   ├── context.ts          # IPC context setup
│   │   └── handlers/           # Domain-specific IPC handlers
│   ├── hooks/                  # Custom React hooks
│   ├── routes/                 # TanStack Router route definitions
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── localization/           # i18n configuration
├── vite.*.config.mts           # Vite configurations
├── biome.jsonc                 # Biome linting config
├── tsconfig.json               # TypeScript configuration
└── package.json
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the application in development mode |
| `npm run check` | Run code quality checks (Biome) |
| `npm run fix` | Auto-fix code style and formatting issues |
| `npm run package` | Package the application for the current platform |
| `npm run make` | Create distributable packages |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests with Playwright |
| `npm run bump-ui` | Update shadcn/ui components |

### Development Workflow

1. **Code Quality**
   - The project uses **Biome** through the **Ultracite** preset
   - Check issues: `npm run check`
   - Auto-fix issues: `npm run fix`
   - Run before committing to ensure compliance

2. **Hot Module Reloading (HMR)**
   - Changes to React components automatically reload without losing state
   - Changes to main process require restart

3. **Testing**
   - Unit tests: `npm run test:unit`
   - E2E tests: `npm run test:e2e`
   - All tests: `npm run test:all`

---

## 🗄️ Database Connections

### MySQL
- Supports MySQL 5.7 and later
- Connection via `mysql2` driver
- Features: Table browsing, query execution, CRUD operations

### PostgreSQL
- Full PostgreSQL support (9.6+)
- Connection via `pg` driver
- Features: Schema navigation, advanced filtering, data manipulation

### SQLite
- File-based database support
- Uses `better-sqlite3` for synchronous operations
- Features: Complete database management, portable storage

### Adding a New Connection

1. Click **"Add Connection"** button
2. Select the database type
3. Enter connection credentials:
   - **Host**: Database server address
   - **Port**: Connection port (default ports pre-filled)
   - **Database**: Database name to connect to
   - **Username**: Authentication username
   - **Password**: Authentication password (encrypted in storage)
4. Test the connection
5. Click **"Save"** to store the connection

---

## 🎯 Core Features Guide

### Connection Viewer
Once connected to a database, you can:
- **Browse Tables**: View all tables in the database from the sidebar
- **View Data**: Click a table to see its data in a paginated view
- **Search/Filter**: Use the filter dialog to narrow down results
- **Edit Rows**: Click on a row to edit its values
- **Add Rows**: Use the "Add Row" button to insert new data
- **Delete Rows**: Remove rows with confirmation

### SQL Query Editor
Execute custom SQL queries:
1. Click the **"SQL Query"** button in the connection header
2. Enter your SQL statement
3. Execute the query
4. Results display below with full support for pagination and export

### Theme & Language
- **Theme**: Toggle between dark and light modes via the theme button
- **Language**: Change interface language via the language selector

---

## 🔧 Technology Stack

### Frontend
- **React 19** - Latest React with server components ready
- **TypeScript** - Type-safe development
- **TanStack Router** - Modern type-safe routing
- **React Query** - Server state management
- **shadcn/ui** - High-quality component library
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Next-generation build tool

### Backend (Electron)
- **Electron 40** - Desktop application framework
- **Electron Forge** - Build and distribution tool
- **oRPC** - Type-safe RPC for IPC communication

### Database
- **mysql2** - MySQL client for Node.js
- **pg** - PostgreSQL client for Node.js
- **better-sqlite3** - SQLite binding for Node.js

### Development & Quality
- **Biome** - Fast formatter and linter (via Ultracite)
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing framework
- **TypeScript** - Static type checking

---

## 📦 Building & Distribution

### Package for Current Platform

```bash
npm run package
```

This creates a distributable package for your operating system.

### Create Installers/Artifacts

```bash
npm run make
```

Generates platform-specific installers:
- **Windows**: `.msi` installer (via WiX, with install-directory selection)
- **macOS**: DMG file
- **Linux**: Debian and RPM packages

> Windows note: building the WiX installer requires WiX Toolset v3 installed on the build machine.

### Publish Releases

```bash
npm run publish
```

Publishes to configured release channels (requires GitHub setup).

### Auto Updates

This app uses `update-electron-app` with the Electron Public Update Service and checks updates from GitHub releases for `tibimate/simple-sql-client`.

Requirements for updates to work:
- The app must be installed from a packaged installer (not `npm start`).
- Release artifacts must be published on GitHub (draft releases are not visible to users).
- `version` in `package.json` must be incremented for each release.

Recommended release flow:
1. Update `version` in `package.json`.
2. Build installers: `npm run make`.
3. Publish release: `npm run publish`.
4. If published as draft, open the GitHub release and click **Publish release**.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Quality**: Run `npm run fix` before committing
2. **Type Safety**: Ensure TypeScript types are correct
3. **Testing**: Add tests for new features
4. **Commits**: Use clear, descriptive commit messages
5. **Branch**: Create feature branches from `main`

### Setup for Contributors

```bash
# Fork and clone
git clone https://github.com/yourusername/electron-react-sqlclient.git

# Install and develop
npm install
npm start

# Make changes and test
npm run check
npm run test

# Submit pull request
```

---

## 🔐 Security Considerations

- **Password Storage**: Connection passwords are stored securely locally
- **Network Security**: Use SSL/TLS for remote database connections
- **SQL Injection**: User input is properly parameterized
- **Sensitive Data**: Avoid committing `.env` or connection config files

---

## 📝 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**tibimate** - [tibimate@gmail.com](mailto:tibimate@gmail.com)

---

## 🙏 Acknowledgments

- **shadcn/ui** - Beautiful component library
- **TanStack** - Router and Query libraries
- **Electron Forge** - Build and distribution tooling
- **Biome** - Modern linting and formatting

---

## 📞 Support & Issues

- **Report Bugs**: [Open an issue](https://github.com/yourusername/electron-react-sqlclient/issues)
- **Request Features**: [Feature requests](https://github.com/yourusername/electron-react-sqlclient/issues)
- **Documentation**: Check the [wiki](https://github.com/yourusername/electron-react-sqlclient/wiki)

---

**Happy querying! 🚀**


## Support

If you find this project helpful, consider supporting my work:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/tibimate)