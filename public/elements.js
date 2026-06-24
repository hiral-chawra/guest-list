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

// ==========================================
// 3. IMPORT FROM CONTACTS API
// ==========================================
const importContactBtn = document.getElementById('import-contact-btn');

if (importContactBtn) {
    importContactBtn.addEventListener('click', async () => {
        // 1. Check if the user's phone/browser supports this feature
        const supported = ('contacts' in navigator && 'ContactsManager' in window);

        if (!supported) {
            alert('Your current browser or device does not support importing contacts. Please type the details manually.');
            return;
        }

        try {
            // 2. Ask the phone for Names and Telephone numbers
            const properties = ['name', 'tel'];
            const options = { multiple: false }; // Only pick one person at a time

            // 3. Open the native contacts app
            const contacts = await navigator.contacts.select(properties, options);

            // 4. If they picked someone, fill out the form
            if (contacts.length > 0) {
                const selectedPerson = contacts[0];

                // Auto-fill Name
                if (selectedPerson.name && selectedPerson.name.length > 0) {
                    const fullName = selectedPerson.name[0];
                    const nameParts = fullName.split(' ');

                    // Put the first word in First Name, and the rest in Last Name
                    document.getElementById('firstName').value = nameParts[0] || '';
                    document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
                }

                // Auto-fill Phone Number
                if (selectedPerson.tel && selectedPerson.tel.length > 0) {
                    // Grab the number and strip out any dashes, brackets, or country codes to get the last 10 digits
                    let rawNum = selectedPerson.tel[0].replace(/\D/g, '');
                    let cleanNum = rawNum.slice(-10);

                    document.getElementById('number').value = cleanNum;

                    // Optional: auto-fill the WhatsApp number with the same number to save time
                    document.getElementById('wpNumber').value = cleanNum;
                }
            }
        } catch (err) {
            console.error('Error picking contact:', err);
            // If the user cancels the picker, it throws an error, so we just ignore it silently
        }
    });
}