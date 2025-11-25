frappe.ui.form.on('Sales Invoice', {
    before_save: function (frm) {
        // Capture the name before save/submit
        frm._old_name = frm.doc.name;
    },
    after_save: function (frm) {
        // If name changed (e.g. from DRAFT-INV- to ACC-SINV-), redirect
        if (frm.doc.name && frm._old_name && frm.doc.name !== frm._old_name) {
            frappe.set_route('Form', frm.doc.doctype, frm.doc.name);
        }
    }
});
