// ==========================================
// 1. ADD GUEST FORM LOGIC (Only runs on the Form page)
// ==========================================
const numberInput = document.getElementById("number");
const wpInput = document.getElementById("wpNumber");

// Only run this if the inputs actually exist on the page
if (numberInput && wpInput) {
    const form = numberInput.closest("form");

    // NUMBER input formatting
    numberInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "").slice(0, 10);
        if (value.length > 5) {
            value = value.slice(0, 5) + " " + value.slice(5);
        }
        e.target.value = value;
    });

    // WP input formatting
    wpInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "").slice(0, 10);
        if (value.length > 5) {
            value = value.slice(0, 5) + " " + value.slice(5);
        }
        e.target.value = value;
    });

    // FORM validation
    if (form) {
        form.addEventListener("submit", (e) => {
            const numberRaw = numberInput.value.replace(/\s/g, "");
            const wpRaw = wpInput.value.replace(/\s/g, "");

            if (numberRaw.length > 0 && numberRaw.length !== 10) {
                e.preventDefault();
                alert("Number must be exactly 10 digits");
                return;
            }

            if (wpRaw.length > 0 && wpRaw.length !== 10) {
                e.preventDefault();
                alert("WhatsApp number must be exactly 10 digits (or leave empty)");
            }
        });
    }
}

// ==========================================
// 2. DOUBLE-CLICK TO EDIT (Only runs on the Table page)
// ==========================================
const editableCells = document.querySelectorAll('.editable');

editableCells.forEach(cell => {
    cell.addEventListener('dblclick', () => {
        makeEditable(cell);
    });
});

function makeEditable(cell) {
    if (cell.isEditing) return; // Prevent double-triggering
    cell.isEditing = true;

    const originalText = cell.innerText.trim();
    const colName = cell.getAttribute('data-col');
    const guestId = cell.closest('tr').getAttribute('data-id');

    // Swap text for an input box
    cell.innerHTML = `<input type="text" value="${originalText}" class="edit-input" />`;
    const input = cell.querySelector('input');

    input.focus();

    // Put cursor at the end of the text
    const val = input.value;
    input.value = '';
    input.value = val;

    // Save on blur (clicking away) or pressing Enter
    input.addEventListener('blur', () => saveCell(cell, input.value, originalText, colName, guestId));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') input.blur();
    });
}

async function saveCell(cell, newValue, originalValue, colName, guestId) {
    cell.isEditing = false;

    // If nothing changed, just revert the text
    if (newValue === originalValue) {
        cell.innerText = originalValue;
        return;
    }

    // Call our backend route
    try {
        const response = await fetch('/update_cell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: guestId, column: colName, value: newValue })
        });

        const result = await response.json();

        if (result.success) {
            cell.innerText = newValue; // Success! Show new text.
        } else {
            cell.innerText = originalValue;
            alert('Failed to save changes to database.');
        }
    } catch (e) {
        cell.innerText = originalValue;
        alert('Network error while saving.');
    }
}