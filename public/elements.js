// ==========================================
// 1. INPUT FORMATTING (Works for cloned forms)
// ==========================================
// Using document event listener so it automatically applies to any newly copied forms
document.addEventListener("input", (e) => {
    if (e.target.name === "number" || e.target.name === "wpNumber") {
        let value = e.target.value.replace(/\D/g, "").slice(0, 10);
        if (value.length > 5) {
            value = value.slice(0, 5) + " " + value.slice(5);
        }
        e.target.value = value;
    }
});

// ==========================================
// 2. BULK IMPORT & CLONE FORMS
// ==========================================
const importContactBtn = document.getElementById('import-contact-btn');
if (importContactBtn) {
    importContactBtn.addEventListener('click', async () => {
        const supported = ('contacts' in navigator && 'ContactsManager' in window);
        if (!supported) {
            alert('Your device does not support importing contacts.');
            return;
        }

        try {
            // Ask the phone for Names and Telephone numbers (multiple allowed)
            const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });

            if (contacts.length > 0) {
                const originalForm = document.querySelector('form');
                const formContainer = originalForm.parentElement;

                // Helper to save a form in the background without refreshing the page
                const attachAjaxSubmit = (form) => {
                    form.onsubmit = async (e) => {
                        e.preventDefault(); // Stop page from redirecting

                        // Validation
                        const numRaw = form.querySelector('[name="number"]').value.replace(/\s/g, "");
                        if (numRaw.length > 0 && numRaw.length !== 10) {
                            alert("Number must be exactly 10 digits");
                            return;
                        }

                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.innerHTML = "Saving...";
                        submitBtn.disabled = true;

                        const formData = new URLSearchParams(new FormData(form));

                        try {
                            await fetch('/All_Guests', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: formData.toString()
                            });

                            // Success! Mark as saved and lock the text boxes
                            submitBtn.innerHTML = "✓ Saved!";
                            submitBtn.classList.replace('btn-success', 'btn-secondary');
                            form.querySelectorAll('input').forEach(i => i.readOnly = true);
                        } catch (err) {
                            alert("Error saving contact.");
                            submitBtn.innerHTML = "Submit";
                            submitBtn.disabled = false;
                        }
                    };
                };

                // Loop through selected contacts and create forms
                contacts.forEach((person, index) => {
                    let targetForm = originalForm;

                    // For the 2nd, 3rd, 4th person, clone the form
                    if (index > 0) {
                        targetForm = originalForm.cloneNode(true);
                        targetForm.reset(); // Clear old values

                        // Remove the extra "Show All Guests" button from cloned forms
                        const showAllBtn = targetForm.querySelector('.btn-secondary');
                        if (showAllBtn) showAllBtn.remove();

                        // Add a visual separator line
                        const divider = document.createElement('p');
                        divider.innerHTML = `<br>----------* <b>Contact ${index + 1}</b> *----------<br>`;
                        divider.style.textAlign = "center";
                        divider.style.marginTop = "20px";

                        formContainer.appendChild(divider);
                        formContainer.appendChild(targetForm);
                    }

                    // Extract data from the phone contact
                    let firstName = "";
                    let lastName = "";
                    let phone = "";

                    if (person.name && person.name.length > 0) {
                        const nameParts = person.name[0].split(' ');
                        firstName = nameParts[0] || '';
                        lastName = nameParts.slice(1).join(' ') || '';
                    }
                    if (person.tel && person.tel.length > 0) {
                        phone = person.tel[0].replace(/\D/g, '').slice(-10);
                    }

                    // Pre-fill the form fields
                    targetForm.querySelector('[name="firstName"]').value = firstName;
                    targetForm.querySelector('[name="lastName"]').value = lastName;
                    targetForm.querySelector('[name="number"]').value = phone;
                    targetForm.querySelector('[name="wpNumber"]').value = phone;

                    // Override the submit button to use our background-save feature
                    attachAjaxSubmit(targetForm);
                });

                // Hide the import button so it isn't clicked again by accident
                importContactBtn.style.display = 'none';
            }
        } catch (err) {
            console.error('Error picking contacts:', err);
        }
    });
}

// ==========================================
// 3. NORMAL FORM SUBMIT (If Import is NOT used)
// ==========================================
const originalForm = document.querySelector('form');
if (originalForm && !originalForm.onsubmit) {
    originalForm.addEventListener("submit", (e) => {
        const numRaw = document.querySelector('[name="number"]')?.value.replace(/\s/g, "") || "";

        if (numRaw.length > 0 && numRaw.length !== 10) {
            e.preventDefault();
            alert("Number must be exactly 10 digits");
        }
    });
}

// ==========================================
// 4. DOUBLE-CLICK TO EDIT (Table logic)
// ==========================================
const editableCells = document.querySelectorAll('.editable');

editableCells.forEach(cell => {
    cell.addEventListener('dblclick', () => {
        makeEditable(cell);
    });
});

function makeEditable(cell) {
    if (cell.isEditing) return;
    cell.isEditing = true;

    const originalText = cell.innerText.trim();
    const colName = cell.getAttribute('data-col');
    const guestId = cell.closest('tr').getAttribute('data-id');

    cell.innerHTML = `<input type="text" value="${originalText}" class="edit-input" />`;
    const input = cell.querySelector('input');

    input.focus();

    const val = input.value;
    input.value = '';
    input.value = val;

    input.addEventListener('blur', () => saveCell(cell, input.value, originalText, colName, guestId));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') input.blur();
    });
}

async function saveCell(cell, newValue, originalValue, colName, guestId) {
    cell.isEditing = false;

    if (newValue === originalValue) {
        cell.innerText = originalValue;
        return;
    }

    try {
        const response = await fetch('/update_cell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: guestId, column: colName, value: newValue })
        });

        const result = await response.json();

        if (result.success) {
            cell.innerText = newValue;
        } else {
            cell.innerText = originalValue;
            alert('Failed to save changes to database.');
        }
    } catch (e) {
        cell.innerText = originalValue;
        alert('Network error while saving.');
    }
}