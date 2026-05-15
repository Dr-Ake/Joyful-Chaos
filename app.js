document.addEventListener('DOMContentLoaded', () => {
    initColorPicker();
    initDragAndDrop();
});

function initColorPicker() {
    const canvas = document.getElementById('rainbow-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Set up canvas sizing for high DPI displays
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    let currentLightness = 50;
    
    // Draw the rainbow
    drawRainbow(ctx, canvas.width, canvas.height, currentLightness);
    
    // Add picker element and event listener
    const pickerRing = document.getElementById('color-picker-ring');
    const lightnessSlider = document.getElementById('lightness-slider');
    
    // Position clouds exactly over the ends of the rainbow
    const leftCloud = document.getElementById('cloud-left');
    const rightCloud = document.getElementById('cloud-right');
    const centerX_css = rect.width / 2;
    const centerY_css = rect.height * 0.9;
    const outerRadius_css = Math.min(rect.width / 2, rect.height) * 0.85;
    const innerRadius_css = outerRadius_css * 0.4;
    const middleRadius_css = (outerRadius_css + innerRadius_css) / 2;
    
    if (leftCloud && rightCloud) {
        const rainbowThickness = outerRadius_css - innerRadius_css;
        const cloudWidth = rainbowThickness * 1.5;
        const cloudHeight = cloudWidth * 0.6; 
        
        leftCloud.style.width = `${cloudWidth}px`;
        leftCloud.style.height = `${cloudHeight}px`;
        leftCloud.style.left = `${centerX_css - middleRadius_css - cloudWidth/2}px`;
        leftCloud.style.top = `${centerY_css - cloudHeight * 0.8}px`; 
        
        rightCloud.style.width = `${cloudWidth}px`;
        rightCloud.style.height = `${cloudHeight}px`;
        rightCloud.style.left = `${centerX_css + middleRadius_css - cloudWidth/2}px`;
        rightCloud.style.top = `${centerY_css - cloudHeight * 0.8}px`;
    }
    
    let isDragging = false;
    let currentPos = { x: rect.width / 2, y: rect.height / 2 };
    
    const updateColorRing = (x, y) => {
        const bounds = canvas.getBoundingClientRect();
        if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return;

        // Handle cloud fading based on picker circle position using bounding box
        if (leftCloud && rightCloud) {
            const rainbowThickness = outerRadius_css - innerRadius_css;
            const cloudW = rainbowThickness * 1.5;
            const cloudH = cloudW * 0.6;
            
            const leftCloudLeft = centerX_css - middleRadius_css - cloudW / 2;
            const rightCloudLeft = centerX_css + middleRadius_css - cloudW / 2;
            const cloudTop = centerY_css - cloudH * 0.8;
            const cloudBottom = cloudTop + cloudH;
            
            const pad = 15; // slightly larger than the ring radius to ensure it fades just as it touches
            
            const inLeft = x >= leftCloudLeft - pad && x <= leftCloudLeft + cloudW + pad && y >= cloudTop - pad && y <= cloudBottom + pad;
            const inRight = x >= rightCloudLeft - pad && x <= rightCloudLeft + cloudW + pad && y >= cloudTop - pad && y <= cloudBottom + pad;
            
            leftCloud.style.opacity = inLeft ? '0' : '1';
            rightCloud.style.opacity = inRight ? '0' : '1';
        }

        pickerRing.style.left = `${x}px`;
        pickerRing.style.top = `${y}px`;

        const pixelX = x * 2;
        const pixelY = y * 2;
        const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
        
        if (pixel[3] === 0) return;
        
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const color = `rgb(${r}, ${g}, ${b})`;
        
        pickerRing.style.backgroundColor = color;
        pickerRing.style.borderColor = '#ffffff';
        
        document.dispatchEvent(new CustomEvent('colorSelected', { detail: { color } }));
    };

    const handlePointerMove = (e) => {
        const bounds = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        currentPos.x = clientX - bounds.left;
        currentPos.y = clientY - bounds.top;
        
        updateColorRing(currentPos.x, currentPos.y);
    };

    if (lightnessSlider) {
        lightnessSlider.addEventListener('input', (e) => {
            currentLightness = parseInt(e.target.value);
            drawRainbow(ctx, canvas.width, canvas.height, currentLightness);
            updateColorRing(currentPos.x, currentPos.y);
        });
    }

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        handlePointerMove(e);
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isDragging) handlePointerMove(e);
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        handlePointerMove(e);
        e.preventDefault();
    }, {passive: false});

    window.addEventListener('touchmove', (e) => {
        if (isDragging) {
            handlePointerMove(e);
            e.preventDefault();
        }
    }, {passive: false});

    window.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function drawRainbow(ctx, width, height, lightness) {
    const centerX = width / 2;
    const centerY = height * 0.9; 
    const outerRadius = Math.min(width / 2, height) * 0.85;
    const innerRadius = outerRadius * 0.4;
    
    ctx.clearRect(0, 0, width, height);
    
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    
    const l = lightness / 100;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (dy <= 0 && distance >= innerRadius - 1.5 && distance <= outerRadius + 1.5) {
                let alpha = 255;
                if (distance < innerRadius) {
                    alpha = (distance - (innerRadius - 1.5)) * (255 / 1.5);
                } else if (distance > outerRadius) {
                    alpha = ((outerRadius + 1.5) - distance) * (255 / 1.5);
                }
                alpha = Math.max(0, Math.min(255, alpha));
                
                let angle = Math.atan2(dy, dx); 
                let hue = ((angle + Math.PI) / Math.PI); 
                
                let sat = (distance - innerRadius) / (outerRadius - innerRadius);
                sat = Math.max(0, Math.min(1, sat));
                
                let rgb = hslToRgb(hue, sat, l);
                
                const index = (y * width + x) * 4;
                data[index] = rgb[0];
                data[index+1] = rgb[1];
                data[index+2] = rgb[2];
                data[index+3] = alpha;
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

function initDragAndDrop() {
    const dropZone = document.getElementById('patch-drop-zone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('patch-drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('patch-drag-active');
        }, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files && files.length > 0) {
            // Placeholder: simulate successful drop
            console.log("File dropped:", files[0].name);
            const msg = dropZone.querySelector('p');
            if(msg) msg.textContent = `Added: ${files[0].name}`;
        }
    }
}
