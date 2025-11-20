
// app.js - Tienda de Tableros de Olivo

// === Configuración de precios ===
const pricesPerM2 = {
    3: 900,
    5: 1200,
    7: 1500
};

// Precio por canto rústico
const RUSTIC_EDGE_PRICE = 50;

// Precio por tipo de uso
const usagePrices = {
    'tabletop': 0,
    'kitchen-countertop': 100,
    'kitchen-island': 150,
    'bathroom-countertop': 80,
    'shelf': 0,
    'other': 0
};

// === Estado global ===
let cart = [];
let edges = {
    north: 'recto',
    east: 'recto',
    south: 'recto',
    west: 'recto'
};
let uso = 'tabletop';
let usoOtros = '';

// === Paths SVG para cantos rústicos ===
const liveEdgePath = {
    north: "M30,60 Q50,50 70,60 T110,60 T150,60 T190,60 T210,60",
    east: "M210,60 Q220,80 210,100 T210,140",
    south: "M210,140 Q190,150 170,140 T130,140 T90,140 T50,140 T30,140",
    west: "M30,140 Q20,120 30,100 T30,60"
};

// === Service Worker ===
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registrado', reg))
        .catch(err => console.log('Error al registrar SW', err));
}

// === PWA Installation ===
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'block';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('Resultado instalación:', outcome);
            deferredPrompt = null;
            installBtn.style.display = 'none';
        }
    });
}

// === Actualizar visualización de cantos ===
function updateEdge(side) {
    const path = document.getElementById(`edge-${side}`);
    const value = document.querySelector(`input[name="edge-${side}"]:checked`)?.value;
    
    if (!path || !value) return;
    
    edges[side] = value;

    if (value === 'rustico') {
        path.setAttribute('d', liveEdgePath[side]);
        path.setAttribute('stroke', '#5D4037');
    } else {
        const straightPaths = {
            north: 'M30,60 H210',
            east: 'M210,60 V140',
            south: 'M210,140 H30',
            west: 'M30,140 V60'
        };
        path.setAttribute('d', straightPaths[side]);
        path.setAttribute('stroke', '#999');
    }
    
    updateEdgesSummary();
    updatePrice();
}

// === Resumen de cantos ===
function updateEdgesSummary() {
    const labels = {
        north: 'Trasero',
        east: 'Derecho',
        south: 'Frontal',
        west: 'Izquierdo'
    };
    
    const parts = Object.entries(edges).map(([key, val]) => {
        const edgeName = labels[key];
        const edgeValue = val === 'recto' ? 'Recto' : 'Rústico';
        return `${edgeName}: <strong>${edgeValue}</strong>`;
    });
    
    const el = document.getElementById('edgesSummary');
    if (el) {
        el.innerHTML = `Configuración de cantos: ${parts.join(', ')}`;
    }
}

// === Actualizar uso ===
function updateUsage() {
    const radios = document.querySelectorAll('input[name="uso"]');
    uso = 'tabletop';

    for (const radio of radios) {
        if (radio.checked) {
            uso = radio.value;
            break;
        }
    }

    const otroInput = document.getElementById('uso-otro-input');
    if (uso === 'other' && otroInput) {
        otroInput.style.display = 'block';
        usoOtros = otroInput.value.trim() || 'otro tablero de olivo macizo';
    } else if (otroInput) {
        otroInput.style.display = 'none';
    }

    updateUsageSummary();
    updatePrice();
}

// === Resumen de uso ===
function updateUsageSummary() {
    const usageLabels = {
        'tabletop': 'Encimera de mesa',
        'kitchen-countertop': 'Encimera de cocina',
        'kitchen-island': 'Isla de cocina',
        'bathroom-countertop': 'Encimera de baño',
        'shelf': 'Estante',
        'other': usoOtros || 'Otro'
    };
    
    const text = usageLabels[uso] || uso;
    const el = document.getElementById('usageSummary');
    if (el) {
        el.innerHTML = `Uso seleccionado: <strong>${text}</strong>`;
    }
}

// === Calcular precio dinámico ===
function updatePrice() {
    const thicknessEl = document.getElementById('thickness');
    const lengthEl = document.getElementById('length');
    const widthEl = document.getElementById('width');
    
    if (!thicknessEl || !lengthEl || !widthEl) {
        console.error('Elementos de dimensiones no encontrados');
        return 0;
    }
    
    const thickness = parseFloat(thicknessEl.value);
    const length = parseFloat(lengthEl.value);
    const width = parseFloat(widthEl.value);
    
    if (isNaN(thickness) || isNaN(length) || isNaN(width)) {
        console.error('Valores inválidos:', thickness, length, width);
        return 0;
    }
    
    // Precio base por superficie
    const area = (length / 100) * (width / 100);
    const basePrice = area * pricesPerM2[thickness];
    
    // Precio por cantos rústicos
    const rusticEdgesCount = Object.values(edges).filter(e => e === 'rustico').length;
    const edgesPrice = rusticEdgesCount * RUSTIC_EDGE_PRICE;
    
    // Precio por uso
    const usagePrice = usagePrices[uso] || 0;
    
    // Precio total
    const totalPrice = basePrice + edgesPrice + usagePrice;
    
    console.log('Calculando precio:', {
        area: area.toFixed(4),
        basePrice: basePrice.toFixed(2),
        rusticEdgesCount,
        edgesPrice: edgesPrice.toFixed(2),
        usagePrice: usagePrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2)
    });
    
    // Actualizar desglose
    const priceBaseEl = document.getElementById('priceBase');
    const priceEdgesEl = document.getElementById('priceEdges');
    const priceUsageEl = document.getElementById('priceUsage');
    const priceDisplayEl = document.getElementById('priceDisplay');
    const rusticEdgesCountEl = document.getElementById('rusticEdgesCount');
    
    if (priceBaseEl) priceBaseEl.textContent = basePrice.toFixed(2);
    if (priceEdgesEl) priceEdgesEl.textContent = edgesPrice.toFixed(2);
    if (priceUsageEl) priceUsageEl.textContent = usagePrice.toFixed(2);
    if (priceDisplayEl) priceDisplayEl.textContent = totalPrice.toFixed(2);
    if (rusticEdgesCountEl) rusticEdgesCountEl.textContent = rusticEdgesCount;
    
    // Actualizar resumen del producto
    updateProductSummary(thickness, length, width, totalPrice);
    
    return totalPrice;
}

// === Actualizar resumen del producto ===
function updateProductSummary(thickness, length, width, price) {
    const edgeCode = ['north','east','south','west']
        .map(s => edges[s] === 'rustico' ? 's' : 'i')
        .join('');
    
    
    const edgeDescriptions = {
        'ssss': 'todos los cantos rústicos',
        'iiii': 'todos los cantos rectos',
        'sisi': 'cantos longitudinales rústicos | transversales rectos',
        'isis': 'cantos longitudinales rectos | transversales rústicos',
        'isss': 'canto trasero recto | resto rústicos',
        'siss': 'canto derecho recto | resto rústicos',
        'ssis': 'canto frontal recto | resto rústicos',
        'sssi': 'canto izquierdo recto | resto rústicos',
        'ssii': 'cantos trasero y derecho rústicos | resto rectos',
        'issi': 'cantos derecho y frontal rústicos | resto rectos',
        'iiss': 'cantos frontal e izquierdo rústicos | resto rectos',
        'siis': 'cantos trasero e izquierdo rústicos | resto rectos,
        'sisi': 'cantos trasero y frontal rectos | resto rústicos',
        'siii': 'canto trasero rústico | resto rectos',
        'isii': 'canto derecho rústico | resto rectos',
        'iisi': 'canto frontal rústico | resto rectos'
    };
    const edgesText = edgeDescriptions[edgeCode] || `configuración personalizada (${edgeCode})`;
    
    const skuPrefix = {
        'tabletop': '31',
        'kitchen-countertop': '32',
        'kitchen-island': '33',
        'bathroom-countertop': '34',
        'shelf': '35',
        'other': '36'
    };
    
    const prefix = skuPrefix[uso] || '36';
    const sku = `${prefix}-${edgeCode}`;
    
    const usageLabels = {
        'tabletop': 'Encimera de mesa',
        'kitchen-countertop': 'Encimera de cocina',
        'kitchen-island': 'Isla de cocina',
        'bathroom-countertop': 'Encimera de baño',
        'shelf': 'Estante',
        'other': usoOtros || 'Otro tablero'
    };
    
    const usoText = usageLabels[uso];
    const productName = `${usoText} ${length}x${width}x${thickness} cm, ${edgesText}`;
    const configuredProduct = `${sku} ${productName}`;
    
    // Actualizar elementos del DOM con el nuevo formato
    const productTypeEl = document.getElementById('productType');
    const dimensionsEl = document.getElementById('productDimensions');
    const edgesEl = document.getElementById('productEdges');
    const skuEl = document.getElementById('productSKU');
    const configuredProductEl = document.getElementById('productConfigured');
    
    if (productTypeEl) productTypeEl.textContent = usoText;
    if (dimensionsEl) dimensionsEl.textContent = `${length} cm × ${width} cm × ${thickness} cm (${(length/100 * width/100).toFixed(2)} m²)`;
    if (edgesEl) edgesEl.textContent = edgesText;
    if (skuEl) skuEl.textContent = sku;
    if (configuredProductEl) configuredProductEl.textContent = configuredProduct;
}

// === Generar nombre del producto completo ===
function generateProductName() {
    const length = document.getElementById('length')?.value || 80;
    const width = document.getElementById('width')?.value || 30;
    const thickness = document.getElementById('thickness')?.value || 3;
    
    const edgeCode = ['north','east','south','west']
        .map(s => edges[s] === 'rustico' ? 's' : 'i')
        .join('');
    
    const edgeDescriptions = {
        'ssss': 'todos los cantos rústicos',
        'iiii': 'todos los cantos rectos',
        'sisi': 'cantos longitudinales rústicos | transversales rectos',
        'isis': 'cantos longitudinales rectos | transversales rústicos'
    };
    
    const edgesText = edgeDescriptions[edgeCode] || `configuración personalizada (${edgeCode})`;
    
    const skuPrefix = {
        'tabletop': '31',
        'kitchen-countertop': '32',
        'kitchen-island': '33',
        'bathroom-countertop': '34',
        'shelf': '35',
        'other': '36'
    };
    
    const prefix = skuPrefix[uso] || '36';
    
    const usageLabels = {
        'tabletop': 'Encimera de mesa',
        'kitchen-countertop': 'Encimera de cocina',
        'kitchen-island': 'Isla de cocina',
        'bathroom-countertop': 'Encimera de baño',
        'shelf': 'Estante',
        'other': usoOtros || 'Otro tablero'
    };
    
    const usoText = usageLabels[uso];
    
    return `${prefix}-${edgeCode}. ${usoText} ${length}x${width}x${thickness} cm, ${edgesText}`;
}

// === Botones +/- para dimensiones ===
function changeValue(id, delta) {
    const input = document.getElementById(id);
    if (!input) return;
    
    let value = parseInt(input.value) || parseInt(input.min);
    value += delta;
    value = Math.max(parseInt(input.min), Math.min(value, parseInt(input.max)));
    input.value = value;
    updatePrice();
}

// === Validar inputs ===
function validateInput(input) {
    let value = parseInt(input.value);
    const min = parseInt(input.min);
    const max = parseInt(input.max);
    
    if (isNaN(value) || value < min) input.value = min;
    else if (value > max) input.value = max;
    
    updatePrice();
}

// === Añadir al carrito ===
function addToCart() {
    const price = updatePrice();
    
    if (isNaN(price) || price <= 0) {
        alert('Por favor, verifica las dimensiones del producto.');
        return;
    }
    
    const productName = generateProductName();
    
    const item = {
        name: productName,
        price: price,
        quantity: 1,
        id: Date.now(),
        thickness: document.getElementById('thickness')?.value || 3,
        length: document.getElementById('length')?.value || 80,
        width: document.getElementById('width')?.value || 30,
        edges: { ...edges },
        uso: uso,
        usoOtros: usoOtros
    };
    
    cart.push(item);
    updateCartDisplay();
    alert('✅ Producto añadido al carrito:\n\n' + productName);
    goToScreen(4); // Ir al carrito
}

// === Eliminar del carrito ===
window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartDisplay();
};

// === Actualizar visualización del carrito ===
function updateCartDisplay() {
    const cartCount = document.querySelector('#cartCount span');
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    const checkoutBtn = document.getElementById('checkout');
    
    let total = 0;
    let itemCount = 0;
    
    if (cartItems) {
        cartItems.innerHTML = '';
        
        cart.forEach((item) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            itemCount += item.quantity;
            
            const div = document.createElement('div');
            div.innerHTML = `
                <p>
                    <strong>${item.name}</strong><br>
                    Precio: ${itemTotal.toFixed(2)} €
                    <button onclick="removeFromCart(${item.id})">🗑️ Eliminar</button>
                </p>
                <hr>
            `;
            cartItems.appendChild(div);
        });
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Tu carrito está vacío.</p>';
        }
    }
    
    if (cartCount) {
        cartCount.textContent = itemCount;
    }
    
    if (totalPrice) {
        if (total > 0) {
            totalPrice.innerHTML = `<p><strong>TOTAL DEL CARRITO: ${total.toFixed(2)} €</strong></p>`;
        } else {
            totalPrice.innerHTML = '';
        }
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = total < 175;
    }
}

// === Vaciar carrito ===
function clearCart() {
    if (confirm('¿Vaciar el carrito?')) {
        cart = [];
        updateCartDisplay();
    }
}

// === Proceso de pago con Stripe ===
async function checkout() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    if (total < 175) {
        alert('El pedido mínimo es de 175 €.');
        return;
    }
    
    if (cart.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    
    const checkoutBtn = document.getElementById('checkout');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Procesando... ⏳';
    }
    
    const orderData = {
        items: cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total: total
    };
    
    console.log('Enviando datos al servidor:', orderData);
    
    try {
        const response = await fetch('create-checkout-session.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('Respuesta del servidor:', response);
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (data.error) {
            alert('Error: ' + data.error);
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'Completar Pedido';
            }
            return;
        }
        
        const stripe = Stripe(data.publishableKey);
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        
        if (result.error) {
            alert(result.error.message);
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'Completar Pedido';
            }
        }
    } catch (error) {
        console.error('Error completo:', error);
        alert('Error al procesar el pago. Revisa la consola (F12)');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Completar Pedido';
        }
    }
}

// === Inicialización ===
document.addEventListener('DOMContentLoaded', () => {
    updatePrice();
    updateEdgesSummary();
    updateUsage();
    updateUsageSummary();
    
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    
    ['thickness', 'length', 'width'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePrice);
            el.addEventListener('change', updatePrice);
        }
    });
    
    document.querySelectorAll('input[name="uso"]').forEach(radio => {
        radio.addEventListener('change', updateUsage);
    });
    
    const usoOtroInput = document.getElementById('uso-otro-input');
    if (usoOtroInput) {
        usoOtroInput.addEventListener('input', updateUsage);
    }
    
    const addBtn = document.getElementById('addToCart');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addToCart();
        });
    }
    
    const clearBtn = document.getElementById('clearCart');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearCart();
        });
    }
    
    const checkoutBtn = document.getElementById('checkout');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            checkout();
        });
    }
});


// === Navegación por pantallas ===
let currentScreen = 0;
const totalScreens = document.querySelectorAll('.screen').length;

function goToScreen(index) {
  if (index < 0 || index >= totalScreens) return;

  // Actualizar clases
  document.querySelectorAll('.screen').forEach((screen, i) => {
    screen.classList.remove('active', 'prev');
    if (i === index) screen.classList.add('active');
    else if (i === currentScreen) screen.classList.add('prev');
  });

  currentScreen = index;

  // Actualizar botones
  document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.style.display = index === 0 ? 'none' : 'inline-block';
  });
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.style.display = index === totalScreens - 1 ? 'none' : 'inline-block';
  });

  // Si estamos en la pantalla de carrito o pago, actualizar el carrito
  if (index >= 4) {
    updateCartDisplay();
  }

  // Si estamos en resumen, actualizar el resumen
  if (index === 3) {
    updatePrice();
  }
}

// Eventos de botones
document.querySelectorAll('.btn-next').forEach(btn => {
  btn.addEventListener('click', () => goToScreen(currentScreen + 1));
});

document.querySelectorAll('.btn-prev').forEach(btn => {
  btn.addEventListener('click', () => goToScreen(currentScreen - 1));
});

// === Swipe en móvil ===
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, { passive: true });

function handleSwipe() {
  const diff = touchStartX - touchEndX;
  const threshold = 50; // px

  if (Math.abs(diff) < threshold) return;

  if (diff > 0 && currentScreen < totalScreens - 1) {
    // Swipe izquierda → siguiente
    goToScreen(currentScreen + 1);
  } else if (diff < 0 && currentScreen > 0) {
    // Swipe derecha → anterior
    goToScreen(currentScreen - 1);
  }
}


window.updateEdge = updateEdge;
window.changeValue = changeValue;
window.validateInput = validateInput;
