# Sites Folder

This folder contains all the websites that will be displayed in the MSJ Browser.

## 📁 How to Add a Website

1. Create a new folder inside this `sites` directory
2. Add an `index.html` or `index.php` file inside your folder
3. Your website will automatically appear in the MSJ Browser!

## 📝 Example Structure

```
sites/
├── my-app/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── my-dashboard/
│   └── index.html
└── my-portfolio/
    └── index.html
```

## ⚙️ Customization

To customize how your website appears in the browser, edit the `websites-config.json` file in the parent `msj` folder:

```json
{
  "my-app": {
    "title": "My Amazing App",
    "description": "A cool web application",
    "category": "tools"
  }
}
```

## 🔄 Auto-Detection

The MSJ Browser automatically scans this folder every 30 seconds and updates the homepage with any new websites you add.

No configuration required - just drop your website folder here and it appears!
