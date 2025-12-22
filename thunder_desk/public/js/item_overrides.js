/*
*  Thunder Desk - Item Form Overrides
*  Adds a custom image upload section since the sidebar is hidden.
*/


frappe.ui.form.on('Item', {
    manage_image: function (frm) {
        toggle_image_section(frm);
    },
    refresh: function (frm) {
        // Handle image section visibility
        toggle_image_section(frm);

        update_image_preview(frm);

        // Bind real-time translation on input with debounce
        if (frm.fields_dict.item_name && frm.fields_dict.item_name.$input) {
            frm.fields_dict.item_name.$input.on('input', frappe.utils.debounce(function () {
                let value = $(this).val();
                if (value) {
                    frappe.call({
                        method: 'thunder_desk.api.get_arabic_translation',
                        args: {
                            text: value
                        },
                        callback: function (r) {
                            if (r.message) {
                                frm.set_value('item_name_arabic', r.message);
                            }
                        }
                    });
                }
            }, 500));
        }
    },
});

function toggle_image_section(frm) {
    if (!frm.custom_image_section) {
        render_image_section(frm);
    }

    if (frm.doc.manage_image) {
        frm.custom_image_section.show();
    } else {
        frm.custom_image_section.hide();
    }
}

function render_image_section(frm) {
    // Container for our custom section
    let $ref_element = (frm.dashboard && frm.dashboard.wrapper) ? frm.dashboard.wrapper : $();

    // Fallback if dashboard wrapper isn't visible or available, try top of layout
    if (!$ref_element.length || $ref_element.is(':hidden')) {
        $ref_element = $(frm.wrapper).find('.form-layout');
    }

    const section_html = `
        <div class="custom-image-section" style="margin-bottom: 20px; padding: 15px; border: 1px solid var(--border-color); border-radius: var(--border-radius); background: var(--card-bg);">
            <div class="row">
                <div class="col-xs-12 col-sm-3">
                    <div class="item-image-container" style="
                        position: relative;
                        width: 100%; 
                        height: 150px; 
                        border-radius: var(--border-radius); 
                        overflow: hidden;
                        border: 1px dashed var(--border-color);">
                        
                        <div class="item-image-preview" style="
                            width: 100%; 
                            height: 100%; 
                            background-color: var(--bg-light-gray); 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;">
                            <i class="fa fa-image text-muted" style="font-size: 3rem;"></i>
                            <img class="img-responsive" style="display: none; width: 100%; height: 100%; object-fit: cover;">
                        </div>

                        <div class="image-overlay" style="
                            position: absolute; 
                            top: 0; 
                            left: 0; 
                            width: 100%; 
                            height: 100%; 
                            background: rgba(0,0,0,0.6); 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            opacity: 0; 
                            transition: opacity 0.2s;
                            cursor: pointer;">
                            <button class="btn btn-default btn-xs btn-upload-image" style="margin-bottom: 5px;">
                                <i class="fa fa-upload"></i> ${__('Upload')}
                            </button>
                             <button class="btn btn-danger btn-xs btn-remove-image" style="display: none;">
                                <i class="fa fa-trash"></i> ${__('Remove')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    frm.custom_image_section = $(section_html).insertBefore($(frm.wrapper).find('.form-layout').first());

    // Hover effect
    frm.custom_image_section.find('.item-image-container').hover(
        function () { $(this).find('.image-overlay').css('opacity', 1); },
        function () { $(this).find('.image-overlay').css('opacity', 0); }
    );

    // Bind events
    frm.custom_image_section.find('.btn-upload-image').on('click', function (e) {
        e.stopPropagation();
        upload_item_image(frm);
    });

    frm.custom_image_section.find('.btn-remove-image').on('click', function (e) {
        e.stopPropagation();
        if (!frm.doc.image) return;

        frappe.confirm(__('Are you sure you want to remove the image?'), () => {
            frm.set_value('image', null);
            frm.save();
        });
    });
}

function update_image_preview(frm) {
    if (!frm.custom_image_section) return;

    const $preview = frm.custom_image_section.find('.item-image-preview');
    const $img = $preview.find('img');
    const $placeholder = $preview.find('.fa-image');
    const $removeBtn = frm.custom_image_section.find('.btn-remove-image');
    const $uploadBtn = frm.custom_image_section.find('.btn-upload-image');

    if (frm.doc.image) {
        $img.attr('src', frm.doc.image).show();
        $placeholder.hide();
        $removeBtn.show();
        $uploadBtn.html(`<i class="fa fa-pencil"></i> ${__('Change')}`);
    } else {
        $img.hide();
        $placeholder.show();
        $removeBtn.hide();
        $uploadBtn.html(`<i class="fa fa-upload"></i> ${__('Upload')}`);
    }
}

function upload_item_image(frm) {
    new frappe.ui.FileUploader({
        doctype: frm.doctype,
        docname: frm.docname,
        active: true,
        folder: 'Home/Attachments',
        restrictions: {
            allowed_file_types: ['image/*']
        },
        on_success: (file_doc) => {
            frm.set_value('image', file_doc.file_url);
            frm.save();
        }
    });
}
