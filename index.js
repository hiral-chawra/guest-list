require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

const path = require("path");

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

// Import supabase
const { createClient } = require('@supabase/supabase-js');

// Pull the keys from the hidden .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
    console.log('Home page requested');
    res.send('Home page requested');
});

app.get("/form", (req, res) => {
    res.render("form");
});

app.get("/All_Guests", async (req, res) => {
    const { data, error } = await supabase
        .from('all_guests')
        .select('*');
    if (error) {
        console.error('Error fetching data from Supabase:', error);
        return;
    }
    res.render("All_Guests", { guests: data, column: "created_at", asc_desc: "asc" });
});

app.post("/All_Guests", async (req, res) => {
    const formdata = req.body;
    console.log('Form data received: \n', formdata);

    const { data, error } = await supabase
        .from('all_guests')
        .insert([
            {
                first_name: formdata.firstName,
                last_name: formdata.lastName,
                number: formdata.number,
                wp_number: formdata.wpNumber,
                category: formdata.category,
                address: formdata.address,
                reference_name: formdata.reference
            }
        ]);
    if (error) {
        console.error('Error inserting data into Supabase:', error);
        res.send("Error inserting data into database.");
        return;
    }
    else {
        console.log('Data inserted successfully:', data);
    }
    res.redirect("/All_Guests");
});

app.post("/delete/:id", async (req, res) => {
    const { error } = await supabase
        .from('all_guests')
        .delete()
        .eq('guest_id', req.params.id)
    if (error) {
        console.error('Error deleting data from Supabase:', error);
        res.send("Error deleting data from database.");
        return;
    }
    res.redirect("/All_Guests");
});

app.get("/search", async (req, res) => {
    const column = req.query.search_column;
    const term = req.query.search_query;
    console.log(req.query);
    const { data, error } = await supabase
        .from('all_guests')
        .select('*')
        .ilike(column, `%${term}%`)
    if (error) {
        console.error('Error searching data from Supabase:', error);
        res.send("Error searching data from database.");
        return;
    }
    res.render("All_Guests", { guests: data, column: "created_at", asc_desc: "asc" });
});

app.get("/order", async (req, res) => {
    console.log(req.query);
    const column = req.query.column;
    const asc_desc = req.query.asc_desc;
    const order = (asc_desc === "asc");

    const { data, error } = await supabase
        .from('all_guests')
        .select('*')
        .order(column, { ascending: order })
    if (error) {
        res.send("Error ordering data from database.");
        console.error('Error ordering data from Supabase:', error);
        return;
    }
    res.render("All_Guests", { guests: data, column, asc_desc });

})

app.post("/update_cell", async (req, res) => {
    const { guest_id, column, value } = req.body;

    // Create an object with the dynamic column name
    const updateData = {};
    updateData[column] = value;

    const { data, error } = await supabase
        .from('all_guests')
        .update(updateData)
        .eq('guest_id', guest_id);

    if (error) {
        console.error('Error updating cell:', error);
        return res.status(500).json({ success: false });
    }

    res.json({ success: true });
});

// ==========================================
// DOWNLOAD CSV ROUTE
// ==========================================
app.get("/download", async (req, res) => {
    // 1. Fetch all data from Supabase
    const { data, error } = await supabase
        .from('all_guests')
        .select('*')
        .order('created_at', { ascending: true }); // Orders by date added

    if (error) {
        console.error('Error fetching data for download:', error);
        res.send("Error downloading data.");
        return;
    }

    // 2. Create the CSV Header row
    let csvData = "Sr. No.,First Name,Last Name,Contact,WhatsApp,Category,Address,Reference,Added At\n";

    // 3. Loop through the data and add each guest as a new row
    data.forEach((guest, index) => {
        // Format the date just like you do in the table, but remove commas so it doesn't break the CSV
        const dateAdded = new Date(guest.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }).replace(/,/g, '');

        // Add the row data (using || '' to leave WhatsApp blank if they don't have one)
        csvData += `${index + 1},${guest.first_name},${guest.last_name},${guest.number},${guest.wp_number || ''},${guest.category},${guest.address},${guest.reference_name},${dateAdded}\n`;
    });

    // 4. Tell the browser this is a CSV file and prompt a download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Guest_List.csv"');
    res.send(csvData);
});

module.exports = app;