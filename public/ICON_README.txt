App Icons Setup
================

Current Status: SVG placeholder icons created
Production Requirement: Convert to PNG format

To convert to PNG:
1. Online: Use svgtopng.com or similar
2. Command line: Use inkscape or ImageMagick
3. Node.js: Use sharp library

Required PNG files:
- icon-192.png (192x192px)
- icon-512.png (512x512px)  
- apple-touch-icon.png (180x180px)

For Capacitor native icons:
- Create a 1024x1024px source icon
- Run: npx @capacitor/assets generate
