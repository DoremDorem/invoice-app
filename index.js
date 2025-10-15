
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'brand-blue': '#1e3a8a', /* Dark Blue */
                'brand-accent': '#10b981', /* Emerald Green */
                'bg-light': '#f9fafb',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
}



document.addEventListener('DOMContentLoaded', () => {
    const itemsContainer = document.getElementById('invoiceItems');
    const addItemBtn = document.getElementById('addItemBtn');
    const taxRateInput = document.getElementById('taxRate');
    const subtotalDisplay = document.getElementById('subtotalDisplay');
    const taxDisplay = document.getElementById('taxDisplay');
    const grandTotalDisplay = document.getElementById('grandTotalDisplay');
    const footerDate = document.getElementById('footerDate');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn'); 
    
    const logoUploadInput = document.getElementById('logoUpload');
    const companyLogo = document.getElementById('companyLogo');

    // --- Initial Setup ---

    const today = new Date();
    document.getElementById('invoiceDate').valueAsDate = today;
    footerDate.textContent = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let itemCounter = 0;
    const replacedElements = []; // To store references for element swapping

    // --- Utility Functions ---

    /** Formats a number as a currency string. */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    /** Calculates the line total for a single row. */
    const calculateLineTotal = (row) => {
        const qty = parseFloat(row.querySelector('input[data-field="qty"]').value) || 0;
        const price = parseFloat(row.querySelector('input[data-field="price"]').value) || 0;
        const lineTotal = qty * price;

        const totalDisplay = row.querySelector('span[data-field="line-total"]');
        if (totalDisplay) {
            totalDisplay.textContent = formatCurrency(lineTotal);
        }
        return lineTotal;
    };

    /** Calculates and updates all invoice totals (subtotal, tax, grand total). */
    const updateInvoiceTotals = () => {
        let subtotal = 0;
        const rows = itemsContainer.querySelectorAll('tr[data-item-id]');

        rows.forEach(row => {
            subtotal += calculateLineTotal(row);
        });

        const taxRate = parseFloat(taxRateInput.value) / 100 || 0;
        const taxAmount = subtotal * taxRate;
        const grandTotal = subtotal + taxAmount;

        subtotalDisplay.textContent = formatCurrency(subtotal);
        taxDisplay.textContent = formatCurrency(taxAmount);
        grandTotalDisplay.textContent = formatCurrency(grandTotal);
    };

    // --- DOM Manipulation ---

    /** Adds a new item row to the invoice table. */
    const addItemRow = (desc = '', qty = 1, price = 0.00) => {
        itemCounter++;
        const itemId = `item-${itemCounter}`;

        const row = document.createElement('tr');
        row.setAttribute('data-item-id', itemId);
        row.classList.add('hover:bg-gray-50', 'transition', 'duration-150');

        row.innerHTML = `
            <td class="p-3 align-top">
                <textarea rows="2" class="invoice-input resize-none bg-transparent" placeholder="Service description or item name" data-field="description">${desc}</textarea>
            </td>
            <td class="p-3 align-top text-center">
                <input type="number" min="0.01" step="any" value="${qty}" class="invoice-input bg-transparent text-center" data-field="qty">
            </td>
            <td class="p-3 align-top text-right">
                <input type="number" min="0.01" step="0.01" value="${price.toFixed(2)}" class="invoice-input bg-transparent text-right" data-field="price">
            </td>
            <td class="p-3 align-top text-right text-base font-semibold text-gray-800">
                <span data-field="line-total">${formatCurrency(qty * price)}</span>
            </td>
            <td class="p-3 align-top no-print">
                <button type="button" class="text-red-500 hover:text-red-700 p-1 rounded-full delete-item-btn" title="Delete Item" data-item-id="${itemId}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </td>
        `;

        const inputs = row.querySelectorAll('input[type="number"], textarea');
        inputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });

        itemsContainer.appendChild(row);
        updateInvoiceTotals();
    };

    // Event delegation for deleting items
    itemsContainer.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-item-btn');
        if (deleteBtn) {
            const itemId = deleteBtn.getAttribute('data-item-id');
            const rowToRemove = itemsContainer.querySelector(`tr[data-item-id="${itemId}"]`);
            if (rowToRemove) {
                rowToRemove.remove();
                updateInvoiceTotals();
            }
        }
    });

    // --- Logo Handling ---
    logoUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                companyLogo.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- PDF Generation Fix: Replacing inputs with static text ---

    /** Replaces an input/textarea with a static span/div element for PDF generation. */
    const replaceWithStaticText = (inputElement) => {
        const isTextarea = inputElement.tagName.toLowerCase() === 'textarea';
        let value = inputElement.value;
        const parent = inputElement.parentNode;

        // For date inputs, use toLocaleDateString for a cleaner display format
        if (inputElement.type === 'date' && value) {
            value = new Date(value).toLocaleDateString('en-US');
        }

        const staticReplacement = document.createElement(isTextarea ? 'div' : 'span');
        staticReplacement.textContent = value;
        
        // Inherit important classes, but add the static-replacement class
        staticReplacement.className = inputElement.className.replace('invoice-input', '') + ' static-replacement';
        
        // Save reference to revert later
        replacedElements.push({ original: inputElement, parent: parent, replacement: staticReplacement });

        parent.replaceChild(staticReplacement, inputElement);
    };

    /** Restores the original input/textarea elements. */
    const restoreOriginalElements = () => {
        replacedElements.forEach(item => {
            item.parent.replaceChild(item.original, item.replacement);
        });
        replacedElements.length = 0; // Clear the array
    };


    const downloadInvoicePdf = () => {
        const input = document.getElementById('invoice-container');
        const invoiceNum = document.getElementById('invoiceNumber').value || 'Invoice';
        const noPrintElements = input.querySelectorAll('.no-print');
        
        // 1. Show a temporary loading state & disable button
        downloadPdfBtn.textContent = "Generating PDF...";
        downloadPdfBtn.disabled = true;

        try {
            // 2. Temporarily hide control elements before capture
            noPrintElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
            
            // 3. FIX: Replace all critical inputs/textareas with static elements
            
            // Info Section Textareas (From and Bill To)
            replaceWithStaticText(document.getElementById('vendorInfo'));
            replaceWithStaticText(document.getElementById('clientInfo'));

            // Invoice Number and Date
            replaceWithStaticText(document.getElementById('invoiceNumber'));
            replaceWithStaticText(document.getElementById('invoiceDate'));

            // **FIX: Tax Rate Input Added**
            replaceWithStaticText(document.getElementById('taxRate'));

            // Table Inputs (Description, Qty, Unit Price)
            const tableInputs = input.querySelectorAll('#invoiceItems .invoice-input');
            tableInputs.forEach(replaceWithStaticText);

            // Notes Textarea
            replaceWithStaticText(document.getElementById('invoiceNotes'));


            // 4. Capture the HTML content
            html2canvas(input, {
                scale: 2, // High scale for better resolution
                allowTaint: true,
                useCORS: true,
            }).then((canvas) => {
                const { jsPDF } = window.jspdf;
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                
                const h = (imgHeight * pdfWidth) / imgWidth;

                if (h <= pdfHeight) {
                    pdf.addImage(imgData, 'JPEG', 0, 5, pdfWidth, h);
                } else {
                    let heightLeft = h;
                    let position = 0;
                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, h);
                    heightLeft -= pdfHeight;
                    while (heightLeft >= 0) {
                        position = heightLeft - h;
                        pdf.addPage();
                        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, h);
                        heightLeft -= pdfHeight;
                    }
                }

                pdf.save(`${invoiceNum}.pdf`);

            }).catch(err => {
                console.error("PDF Generation Error:", err);
            }).finally(() => {
                // 5. Restore button state, hidden elements, and original inputs
                downloadPdfBtn.textContent = "Download PDF";
                downloadPdfBtn.disabled = false;
                noPrintElements.forEach(el => el.style.removeProperty('display'));
                restoreOriginalElements(); // Restore all inputs/textareas
            });

        } catch (e) {
            console.error("Critical PDF process error:", e);
            // Ensure cleanup happens even if an error occurs outside of the .then chain
            downloadPdfBtn.textContent = "Download PDF";
            downloadPdfBtn.disabled = false;
            noPrintElements.forEach(el => el.style.removeProperty('display'));
            restoreOriginalElements();
        }
    };

    // --- Event Listeners ---

    // Initial demo items
    addItemRow('Consulting Services (5 hours)', 5, 120.00);
    addItemRow('Software License Fee (Annual)', 1, 499.00);

    // Add item button click listener
    addItemBtn.addEventListener('click', () => addItemRow());

    // Listen to tax rate changes and generic inputs
    taxRateInput.addEventListener('input', updateInvoiceTotals);
    
    // Listen to all text inputs to ensure calculations and print view are up-to-date
    document.querySelectorAll('input[type="text"], textarea, input[type="date"]').forEach(input => {
        input.addEventListener('input', updateInvoiceTotals);
    });
    
    // Listener for the PDF download button
    downloadPdfBtn.addEventListener('click', downloadInvoicePdf);

    // Initial calculation
    updateInvoiceTotals();
});

