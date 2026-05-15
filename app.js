document.addEventListener('DOMContentLoaded', () => {
    initColorPicker();
    initDragAndDrop();
    initVinylPage();
    initClothingSelector();
});

let currentActiveColor = '#ffffff';


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
    
    let currentLightness = 100;
    
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
        currentActiveColor = color;
        
        pickerRing.style.backgroundColor = color;
        pickerRing.style.borderColor = '#ffffff';
        
        // Update the active clothing item's color immediately
        const activeSvgPaths = document.querySelectorAll('#dynamic-clothing-area .clothing-svg path.fillable');
        if (activeSvgPaths) {
            activeSvgPaths.forEach(p => p.setAttribute('fill', color));
        }
        
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

        let rawX = clientX - bounds.left;
        let rawY = clientY - bounds.top;
        
        // Constrain to rainbow semi-circle bounds to prevent losing color tracking
        let dx = rawX - centerX_css;
        let dy = rawY - centerY_css;
        
        // Rainbow is only above the center line (with 2px padding to avoid edge pixels)
        if (dy > -2) dy = -2;
        
        let dist = Math.sqrt(dx * dx + dy * dy);
        let minR = innerRadius_css + 2;
        let maxR = outerRadius_css - 2;
        
        if (dist > 0) {
            if (dist < minR) {
                dx = (dx / dist) * minR;
                dy = (dy / dist) * minR;
            } else if (dist > maxR) {
                dx = (dx / dist) * maxR;
                dy = (dy / dist) * maxR;
            }
        } else {
            dx = 0;
            dy = -minR;
        }
        
        currentPos.x = centerX_css + dx;
        currentPos.y = centerY_css + dy;
        
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

function hsvToRgb(h, s, v) {
    let r, g, b;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
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
                let sat = ((angle + Math.PI) / Math.PI); 
                
                let hueMap = (outerRadius - distance) / (outerRadius - innerRadius);
                hueMap = Math.max(0, Math.min(1, hueMap));
                let hue = hueMap * 0.85; // Map from Red (0) to Violet (0.85)
                
                let rgb = hsvToRgb(hue, sat, l);
                
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
    const fileInput = document.getElementById('patch-file-input');
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
    
    if (fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                processFile(e.target.files[0]);
            }
        });
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    }
    
    function processFile(file) {
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const dropZone = document.getElementById('patch-drop-zone');
            
            // Show preview in the drop zone itself using an overlay container
            let previewContainer = dropZone.querySelector('.patch-preview-container');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.className = 'patch-preview-container absolute inset-0 bg-surface-container-low z-10 p-4 rounded-[1.5rem]';
                dropZone.appendChild(previewContainer);
            }
            
            previewContainer.innerHTML = `
                <div class="relative w-full h-full flex items-center justify-center group-hover:bg-surface-container-highest/50 rounded-xl transition-colors">
                    <img src="${dataUrl}" class="max-w-full max-h-full object-contain drop-shadow-md rounded" />
                    <div class="absolute inset-0 bg-surface-container/90 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity rounded-xl">
                        <span class="material-symbols-outlined text-[32px] text-primary mb-2">swap_horiz</span>
                        <p class="font-label-md font-medium text-primary">Click to change design</p>
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}

const svgRegistry = {
    'tshirt': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 10 45 L 20 55 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 80 55 L 90 45 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    'longsleeve': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 5 75 L 15 80 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 85 80 L 95 75 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    'pullover': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 5 75 L 15 80 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 85 80 L 95 75 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
        <line x1="30" y1="80" x2="70" y2="80" stroke="#1a1b24" stroke-width="3"/>
        <line x1="9" y1="65" x2="19" y2="70" stroke="#1a1b24" stroke-width="3"/>
        <line x1="91" y1="65" x2="81" y2="70" stroke="#1a1b24" stroke-width="3"/>
    </svg>`,
    'zipup': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 5 75 L 15 80 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 85 80 L 95 75 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="25" x2="50" y2="92" stroke="#1a1b24" stroke-width="3"/>
        <line x1="30" y1="80" x2="70" y2="80" stroke="#1a1b24" stroke-width="3"/>
        <line x1="9" y1="65" x2="19" y2="70" stroke="#1a1b24" stroke-width="3"/>
        <line x1="91" y1="65" x2="81" y2="70" stroke="#1a1b24" stroke-width="3"/>
    </svg>`,
    'hoodie': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 C 35 0, 65 0, 60 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path class="fillable" d="M 40 20 L 25 25 L 5 75 L 15 80 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 85 80 L 95 75 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <line x1="30" y1="80" x2="70" y2="80" stroke="#1a1b24" stroke-width="3"/>
        <line x1="9" y1="65" x2="19" y2="70" stroke="#1a1b24" stroke-width="3"/>
        <line x1="91" y1="65" x2="81" y2="70" stroke="#1a1b24" stroke-width="3"/>
        <path d="M 40 60 L 60 60 L 65 75 L 35 75 Z" fill="none" stroke="#1a1b24" stroke-width="2" stroke-linejoin="round"/>
        <path d="M 45 30 Q 40 45 45 50" fill="none" stroke="#1a1b24" stroke-width="2" stroke-linecap="round"/>
        <path d="M 55 30 Q 60 45 55 50" fill="none" stroke="#1a1b24" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    'pocketshirt': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 10 45 L 20 55 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 80 55 L 90 45 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
        <path d="M 57 35 L 65 35 L 65 43 L 61 47 L 57 43 Z" fill="none" stroke="#1a1b24" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
    'baseballhat': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M 46 34 L 46 31 Q 50 29 54 31 L 54 34" fill="#1a1b24" />
        <path class="fillable" d="M 25 60 C 25 20, 75 20, 75 60 C 60 53, 40 53, 25 60 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path class="fillable" d="M 20 65 C 35 53, 65 53, 80 65 C 85 70, 75 75, 65 70 C 55 65, 45 65, 35 70 C 25 75, 15 70, 20 65 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
    </svg>`,
    'buckethat': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 35 30 L 65 30 L 70 60 L 90 75 C 90 85, 10 85, 10 75 L 30 60 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 30 60 C 45 65, 55 65, 70 60" fill="none" stroke="#1a1b24" stroke-width="3"/>
    </svg>`,
    'totebag': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 20 40 L 80 40 L 75 90 C 75 95, 25 95, 25 90 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 35 40 C 35 10, 65 10, 65 40" fill="none" stroke="#1a1b24" stroke-width="4"/>
        <path d="M 35 40 L 35 45" fill="none" stroke="#1a1b24" stroke-width="2"/>
        <path d="M 65 40 L 65 45" fill="none" stroke="#1a1b24" stroke-width="2"/>
    </svg>`,
    'polo': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 10 45 L 20 55 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 80 55 L 90 45 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20 L 65 30 L 50 40 L 35 30 Z" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <line x1="50" y1="40" x2="50" y2="55" stroke="#1a1b24" stroke-width="3"/>
        <circle cx="45" cy="45" r="1.5" fill="#1a1b24"/>
        <circle cx="45" cy="50" r="1.5" fill="#1a1b24"/>
    </svg>`,
    'beanie': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 20 65 C 20 20, 80 20, 80 65 C 80 75, 20 75, 20 65 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <line x1="20" y1="55" x2="80" y2="55" stroke="#1a1b24" stroke-width="3"/>
        <line x1="30" y1="55" x2="30" y2="70" stroke="#1a1b24" stroke-width="2"/>
        <line x1="40" y1="55" x2="40" y2="72" stroke="#1a1b24" stroke-width="2"/>
        <line x1="50" y1="55" x2="50" y2="72" stroke="#1a1b24" stroke-width="2"/>
        <line x1="60" y1="55" x2="60" y2="72" stroke="#1a1b24" stroke-width="2"/>
        <line x1="70" y1="55" x2="70" y2="70" stroke="#1a1b24" stroke-width="2"/>
    </svg>`,
    'tanktop': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 35 25 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 65 25 L 60 20 Q 50 35 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    'vneck': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 10 45 L 20 55 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 80 55 L 90 45 L 75 25 L 60 20 L 50 40 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    'croptop': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 10 45 L 20 55 L 30 45 L 30 60 C 30 65, 70 65, 70 60 L 70 45 L 80 55 L 90 45 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    'quarterzip': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 5 75 L 15 80 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 85 80 L 95 75 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="25" x2="50" y2="45" stroke="#1a1b24" stroke-width="3"/>
        <circle cx="50" cy="45" r="2" fill="#1a1b24"/>
        <line x1="30" y1="80" x2="70" y2="80" stroke="#1a1b24" stroke-width="3"/>
        <line x1="9" y1="65" x2="19" y2="70" stroke="#1a1b24" stroke-width="3"/>
        <line x1="91" y1="65" x2="81" y2="70" stroke="#1a1b24" stroke-width="3"/>
    </svg>`,
    'snapback': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M 46 34 L 46 31 Q 50 29 54 31 L 54 34" fill="#1a1b24" />
        <path class="fillable" d="M 25 60 C 25 20, 75 20, 75 60 C 60 53, 40 53, 25 60 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path class="fillable" d="M 20 65 C 35 53, 65 53, 80 65 C 85 70, 75 75, 65 70 C 55 65, 45 65, 35 70 C 25 75, 15 70, 20 65 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
    </svg>`,
    'visor': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 25 60 L 28 45 Q 50 40 72 45 L 75 60 C 60 53, 40 53, 25 60 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path class="fillable" d="M 20 65 C 35 53, 65 53, 80 65 C 85 70, 75 75, 65 70 C 55 65, 45 65, 35 70 C 25 75, 15 70, 20 65 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
    </svg>`,
    'flatbill': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M 46 34 L 46 31 Q 50 29 54 31 L 54 34" fill="#1a1b24" />
        <path class="fillable" d="M 25 60 C 25 20, 75 20, 75 60 C 60 53, 40 53, 25 60 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path class="fillable" d="M 25 60 L 15 65 L 15 68 C 40 72, 60 72, 85 68 L 85 65 L 75 60 C 60 53, 40 53, 25 60 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 15 65 C 40 69, 60 69, 85 65" fill="none" stroke="#1a1b24" stroke-width="2"/>
    </svg>`,
    'threequarter': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 40 20 L 25 25 L 15 50 L 25 55 L 30 45 L 30 90 C 30 95, 70 95, 70 90 L 70 45 L 75 55 L 85 50 L 75 25 L 60 20 Q 50 30 40 20 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 20 Q 50 10 60 20" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    'backpack': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 30 30 C 30 10, 70 10, 70 30 L 75 80 C 75 90, 25 90, 25 80 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 35 60 L 65 60 L 65 80 L 35 80 Z" fill="none" stroke="#1a1b24" stroke-width="3"/>
        <path d="M 45 60 L 45 80" fill="none" stroke="#1a1b24" stroke-width="2"/>
        <path d="M 55 60 L 55 80" fill="none" stroke="#1a1b24" stroke-width="2"/>
        <path d="M 25 40 L 20 40 L 20 70 L 25 70" fill="none" stroke="#1a1b24" stroke-width="2"/>
        <path d="M 75 40 L 80 40 L 80 70 L 75 70" fill="none" stroke="#1a1b24" stroke-width="2"/>
    </svg>`,
    'drawstring': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 30 20 L 70 20 L 80 90 C 80 95, 20 95, 20 90 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 20 90 L 30 20 L 70 20 L 80 90" fill="none" stroke="#1a1b24" stroke-width="2" stroke-dasharray="2 2"/>
    </svg>`,
    'duffel': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 20 40 L 80 40 A 10 20 0 0 1 80 80 L 20 80 A 10 20 0 0 1 20 40 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 40 40 C 40 10, 60 10, 60 40" fill="none" stroke="#1a1b24" stroke-width="4"/>
        <path d="M 35 40 L 35 80" fill="none" stroke="#1a1b24" stroke-width="2"/>
        <path d="M 65 40 L 65 80" fill="none" stroke="#1a1b24" stroke-width="2"/>
        <path d="M 20 60 L 80 60" fill="none" stroke="#1a1b24" stroke-width="2"/>
    </svg>`,
    'messenger': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 15 40 L 85 40 L 80 80 C 80 85, 20 85, 20 80 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 15 40 L 85 40 L 80 65 C 80 70, 20 70, 20 65 Z" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 15 40 L 5 20 L 95 20 L 85 40" fill="none" stroke="#1a1b24" stroke-width="2"/>
        <circle cx="50" cy="60" r="3" fill="#1a1b24"/>
    </svg>`,
    'cooler': `<svg class="clothing-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path class="fillable" d="M 25 40 L 75 40 L 75 85 L 25 85 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path class="fillable" d="M 25 40 L 40 30 L 90 30 L 75 40 Z" fill="currentColor" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 75 40 L 75 85 L 90 75 L 90 30 Z" fill="none" stroke="#1a1b24" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 25 40 C 25 10, 75 10, 75 40" fill="none" stroke="#1a1b24" stroke-width="3"/>
    </svg>`
};

const catalogData = {
    'tshirts': [
        { id: 'ts-short', name: 'Short Sleeves', baseSvg: 'tshirt' },
        { id: 'ts-long', name: 'Long Sleeves', baseSvg: 'longsleeve' },
        { id: 'ts-3q', name: 'Three-Quarter Sleeve', baseSvg: 'threequarter' },
        { id: 'ts-tank', name: 'Tank-Tops', baseSvg: 'tanktop' },
        { id: 'ts-vneck', name: 'V-Necks', baseSvg: 'vneck' },
        { id: 'ts-crop', name: 'Crop Tops', baseSvg: 'croptop' },
        { id: 'ts-pocket', name: 'Pockets', baseSvg: 'pocketshirt' },
        { id: 'ts-active', name: 'Activewear', baseSvg: 'tshirt' }
    ],
    'sweaters': [
        { id: 'sw-crew', name: 'Crewnecks', baseSvg: 'pullover' },
        { id: 'sw-hoodie', name: 'Hoodies', baseSvg: 'hoodie' },
        { id: 'sw-pull', name: 'Pullovers', baseSvg: 'pullover' },
        { id: 'sw-qzip', name: 'Quarter-Zips', baseSvg: 'quarterzip' },
        { id: 'sw-fzip', name: 'Full-Zips', baseSvg: 'zipup' },
        { id: 'sw-active', name: 'Activewear', baseSvg: 'pullover' },
        { id: 'sw-pocket', name: 'Pockets', baseSvg: 'hoodie' }
    ],
    'polos': [
        { id: 'po-short', name: 'Short Sleeves', baseSvg: 'polo' },
        { id: 'po-long', name: 'Long Sleeves', baseSvg: 'polo' },
        { id: 'po-perf', name: 'Performance', baseSvg: 'polo' },
        { id: 'po-jersey', name: 'Jersey', baseSvg: 'polo' },
        { id: 'po-pique', name: 'Pique', baseSvg: 'polo' },
        { id: 'po-pocket', name: 'Pockets', baseSvg: 'polo' }
    ],
    'hats': [
        { id: 'ht-5p', name: 'Five-Panel', baseSvg: 'baseballhat' },
        { id: 'ht-6p', name: 'Six-Panel', baseSvg: 'baseballhat' },
        { id: 'ht-snap', name: 'Snapbacks', baseSvg: 'snapback' },
        { id: 'ht-bucket', name: 'Buckets', baseSvg: 'buckethat' },
        { id: 'ht-struct', name: 'Structured', baseSvg: 'baseballhat' },
        { id: 'ht-unstruct', name: 'Unstructured', baseSvg: 'baseballhat' },
        { id: 'ht-adj', name: 'Adjustable', baseSvg: 'baseballhat' },
        { id: 'ht-fitted', name: 'Fitted', baseSvg: 'baseballhat' },
        { id: 'ht-knit', name: 'Knit', baseSvg: 'beanie' },
        { id: 'ht-trucker', name: 'Truckers', baseSvg: 'baseballhat' },
        { id: 'ht-rope', name: 'Rope', baseSvg: 'baseballhat' },
        { id: 'ht-beanie', name: 'Beanies', baseSvg: 'beanie' },
        { id: 'ht-visor', name: 'Visors', baseSvg: 'visor' },
        { id: 'ht-flat', name: 'Flat Bills', baseSvg: 'flatbill' },
        { id: 'ht-low', name: 'Low Profile', baseSvg: 'baseballhat' },
        { id: 'ht-mid', name: 'Mid Profile', baseSvg: 'baseballhat' },
        { id: 'ht-high', name: 'High Profile', baseSvg: 'baseballhat' },
        { id: 'ht-safety', name: 'Safety', baseSvg: 'baseballhat' },
        { id: 'ht-active', name: 'Activewear', baseSvg: 'baseballhat' }
    ],
    'bags': [
        { id: 'bg-tote', name: 'Totes', baseSvg: 'totebag' },
        { id: 'bg-back', name: 'Backpacks', baseSvg: 'backpack' },
        { id: 'bg-cinch', name: 'Cinch', baseSvg: 'drawstring' },
        { id: 'bg-draw', name: 'Drawstrings', baseSvg: 'drawstring' },
        { id: 'bg-duff', name: 'Duffel Bags', baseSvg: 'duffel' },
        { id: 'bg-travel', name: 'Travel Bags', baseSvg: 'backpack' },
        { id: 'bg-mess', name: 'Messenger Bags', baseSvg: 'messenger' },
        { id: 'bg-cool', name: 'Cooler', baseSvg: 'cooler' },
        { id: 'bg-hip', name: 'Crossback / Hip Packs', baseSvg: 'messenger' },
        { id: 'bg-lap', name: 'Laptop/Tablet Holders', baseSvg: 'messenger' },
        { id: 'bg-gusset', name: 'Gusset', baseSvg: 'totebag' },
        { id: 'bg-pocket', name: 'Pockets', baseSvg: 'totebag' },
        { id: 'bg-zip', name: 'Zipper Pockets', baseSvg: 'totebag' }
    ]
};

function initClothingSelector() {
    const area = document.getElementById('dynamic-clothing-area');
    const tabsContainer = document.querySelector('#catalog-palette .flex.items-center.justify-between');
    const subitemsList = document.getElementById('catalog-subitems');
    if (!area || !tabsContainer || !subitemsList) return;
    
    let currentSvg = 'tshirt';
    let currentCategory = 'tshirts';
    
    const mountSvg = (itemKey, isInitial) => {
        const svgContent = svgRegistry[itemKey];
        if (!svgContent) return null;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'clothing-wrapper active-clothing';
        if (!isInitial) wrapper.classList.add('slide-in-active');
        
        wrapper.innerHTML = svgContent;
        
        const fillable = wrapper.querySelectorAll('.fillable');
        if (fillable) {
            fillable.forEach(path => path.setAttribute('fill', currentActiveColor));
        }
        
        area.appendChild(wrapper);
        return wrapper;
    };
    
    let activeWrapper = mountSvg(currentSvg, true);
    
    const renderSubitems = (category) => {
        subitemsList.innerHTML = '';
        const items = catalogData[category];
        if (!items) return;
        
        items.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.className = 'flex items-center gap-3 p-2 rounded-xl text-left transition-colors hover:bg-surface-container-high w-full';
            if (index === 0 && currentCategory !== category) {
                // If it's a new category, we don't automatically select the first item, 
                // but we might want to highlight what's currently active if we had an activeId tracking
            }
            
            // Generate a mini thumbnail from the baseSvg
            const thumbHtml = svgRegistry[item.baseSvg].replace('clothing-svg w-full h-full', 'w-8 h-8').replace(/fillable/g, 'btn-icon-fill text-primary');
            
            btn.innerHTML = `
                <div class="w-10 h-10 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center shrink-0">
                    ${thumbHtml}
                </div>
                <span class="font-label-md text-label-md text-on-surface-variant flex-grow">${item.name}</span>
                <span class="material-symbols-outlined text-outline-variant text-[16px] opacity-0 group-hover:opacity-100">chevron_right</span>
            `;
            
            // Add a group class for the hover effect
            btn.classList.add('group');

            btn.addEventListener('click', () => {
                const newItemSvg = item.baseSvg;
                
                // Highlight active state in list
                const allBtns = subitemsList.querySelectorAll('button');
                allBtns.forEach(b => {
                    b.classList.remove('bg-primary-fixed', 'border-primary');
                    b.classList.add('hover:bg-surface-container-high');
                    const textSpan = b.querySelector('span.font-label-md');
                    if (textSpan) textSpan.classList.replace('text-on-primary-fixed', 'text-on-surface-variant');
                });
                
                btn.classList.add('bg-primary-fixed');
                btn.classList.remove('hover:bg-surface-container-high');
                const textSpan = btn.querySelector('span.font-label-md');
                if (textSpan) textSpan.classList.replace('text-on-surface-variant', 'text-on-primary-fixed');

                // Always animate, even if the base SVG is the same, to give visual feedback
                if (activeWrapper) {
                    const oldWrapper = activeWrapper;
                    oldWrapper.classList.remove('slide-in-active', 'active-clothing');
                    oldWrapper.classList.add('slide-out-active');
                    
                    setTimeout(() => {
                        oldWrapper.remove();
                    }, 400); 
                    
                    currentSvg = newItemSvg;
                    activeWrapper = mountSvg(currentSvg, false);
                }
            });
            
            subitemsList.appendChild(btn);
        });
    };
    
    // Initialize category icons
    const tabBtns = tabsContainer.querySelectorAll('.catalog-tab-btn');
    tabBtns.forEach(tab => {
        const iconKey = tab.getAttribute('data-icon');
        if (svgRegistry[iconKey]) {
            tab.innerHTML = svgRegistry[iconKey].replace('clothing-svg w-full h-full', 'w-7 h-7').replace(/fillable/g, 'btn-icon-fill');
        }
    });

    // Initialize tabs
    tabBtns.forEach(tab => {
        tab.addEventListener('click', () => {
            const cat = tab.getAttribute('data-category');
            if (cat === currentCategory) return;
            
            tabBtns.forEach(t => {
                t.classList.remove('active', 'text-primary');
                t.classList.add('text-on-surface-variant');
            });
            tab.classList.add('active', 'text-primary');
            tab.classList.remove('text-on-surface-variant');
            
            currentCategory = cat;
            renderSubitems(cat);
        });
    });
    
    // Render initial list
    renderSubitems(currentCategory);
}

function initVinylPage() {
    // 1. Drop Zone logic
    const vinylDropZone = document.getElementById('vinyl-drop-zone');
    if (vinylDropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            vinylDropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            vinylDropZone.addEventListener(eventName, () => {
                vinylDropZone.classList.add('bg-primary-fixed/20');
                vinylDropZone.classList.add('border-primary');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            vinylDropZone.addEventListener(eventName, () => {
                vinylDropZone.classList.remove('bg-primary-fixed/20');
                vinylDropZone.classList.remove('border-primary');
            }, false);
        });

        vinylDropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                const msg = vinylDropZone.querySelector('h3');
                if(msg) msg.textContent = `Uploaded: ${files[0].name}`;
            }
        }, false);
    }

    // 2. Color Selection Logic
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const colorLabel = document.getElementById('selected-color-label');
    
    if (colorSwatches.length > 0) {
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                // Remove active ring from all
                colorSwatches.forEach(s => {
                    s.classList.remove('ring-primary');
                    s.classList.add('ring-transparent');
                });
                
                // Add active ring to selected
                swatch.classList.remove('ring-transparent');
                swatch.classList.add('ring-primary');
                
                // Update label
                if (colorLabel) {
                    colorLabel.textContent = `Selected: ${swatch.getAttribute('data-color')}`;
                }
            });
        });
        
        // Select first by default
        colorSwatches[0].click();
    }
}
