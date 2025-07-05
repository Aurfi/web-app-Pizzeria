#!/bin/bash

# Create a simple base icon using ImageMagick or a placeholder
# This script creates placeholder PWA icons for the application

mkdir -p icons

# Create a simple SVG icon as base
cat > icon-base.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#4F46E5" rx="64"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">FF</text>
</svg>
EOF

# If ImageMagick is available, generate different sizes
if command -v convert &> /dev/null; then
    echo "Generating PWA icons..."
    
    # Generate different sizes
    for size in 72 96 128 144 152 192 384 512; do
        convert -background none -density 300 icon-base.svg -resize ${size}x${size} icons/icon-${size}x${size}.png
        echo "Created icons/icon-${size}x${size}.png"
    done
    
    # Create maskable icon
    convert -background white -density 300 icon-base.svg -resize 512x512 icons/icon-maskable.png
    echo "Created icons/icon-maskable.png"
    
    # Create favicon
    convert -background none -density 300 icon-base.svg -resize 32x32 favicon.ico
    echo "Created favicon.ico"
else
    echo "ImageMagick not found. Creating placeholder text files instead..."
    
    # Create placeholder files
    for size in 72 96 128 144 152 192 384 512; do
        echo "Placeholder for ${size}x${size} icon" > icons/icon-${size}x${size}.txt
        echo "Created placeholder: icons/icon-${size}x${size}.txt"
    done
    
    echo "Placeholder for maskable icon" > icons/icon-maskable.txt
    echo "Note: Install ImageMagick and run this script again to generate actual icons"
fi

echo "Icon generation complete!"