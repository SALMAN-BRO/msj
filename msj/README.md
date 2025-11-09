# MSJ Browser - Auto-Discovery System

## 🚀 Features

### Automatic Website Detection
The MSJ Browser automatically detects and displays all website folders in the `sites` folder inside `msj`. 

**How it works:**
1. PHP script (`get-websites.php`) scans the `msj/sites` directory
2. Finds all folders with `index.html` or `index.php`
3. Automatically displays them on the homepage
4. Refreshes every 30 seconds to detect new websites

### No Manual Configuration Required!
Simply create a new folder in the `msj/sites` directory with an `index.html` file, and it will automatically appear in the MSJ Browser!

## 📁 Directory Structure

```
website/
├── msj/                    (MSJ Browser)
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── get-websites.php    (Auto-discovery script)
│   ├── websites-config.json (Optional customization)
│   └── sites/              (Put your websites here!)
│       ├── journal/        (Auto-detected)
│       │   └── index.html
│       ├── maintainer/     (Auto-detected)
│       │   └── index.html
│       └── your-website/   (Will be auto-detected!)
│           └── index.html
└── other-folders/
```

## 🎨 Customizing Website Appearance

To customize how a website appears in the browser, edit `websites-config.json`:

```json
{
  "your-website-name": {
    "title": "My Awesome Website",
    "description": "A beautiful website for amazing things",
    "category": "tools"
  }
}
```

### Configuration Options:
- **title**: Display name (default: capitalized folder name)
- **description**: Brief description (default: "Web application")
- **category**: Category for grouping (default: "general")

## 🔄 Auto-Refresh

The browser automatically checks for new websites every **30 seconds**. You don't need to refresh the page!

## ⚡ Quick Start

1. Create a new folder inside `msj/sites` directory
2. Add an `index.html` file
3. Wait up to 30 seconds or refresh the homepage
4. Your website appears automatically! 

## 🎯 Example: Adding a New Website

```bash
# Navigate to msj/sites directory
cd website/msj/sites/

# Create new website folder
mkdir my-dashboard

# Create index file
echo "<!DOCTYPE html><html>..." > my-dashboard/index.html

# Done! It will appear in MSJ Browser automatically
```

## 🔐 Security

The PHP script:
- Only scans one directory level (parent folder)
- Excludes system folders (.git, node_modules, etc.)
- Only lists folders with valid index files
- Uses proper JSON encoding and headers

## 📝 Notes

- Websites must have `index.html` or `index.php` to be detected
- Only folders inside `msj/sites/` are scanned
- Websites are sorted alphabetically by title
- Invalid folders are automatically ignored
- System folders (.git, node_modules, vendor) are excluded
