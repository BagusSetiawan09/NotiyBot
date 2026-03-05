/**
 * @fileoverview Enterprise Workspace Management Module
 * Handles workspaces, nested items, robust CRUD logic, and safety modals.
 */

let rawSpaces = localStorage.getItem('notiybot_spaces');
window.workspaces = [];
window.editingSpaceId = null; 

// Item Context State
window.activeItemSpaceId = null;
window.activeItemIndex = null;
window.isEditingItem = false;

try {
    window.workspaces = rawSpaces ? JSON.parse(rawSpaces) : [];
    if (!Array.isArray(window.workspaces)) window.workspaces = [];
} catch(e) {
    console.error("Enterprise Data Error: Resetting corrupt workspace data.", e);
    window.workspaces = [];
}

window.activeWorkspaceId = window.workspaces.length > 0 ? window.workspaces[0].id : null;

/** Helper function to get SVG based on item type */
function getItemSvg(type) {
    switch(type) {
        case 'APP': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`;
        case 'FOLDER': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>`;
        case 'TASK': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>`;
        default: return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>`;
    }
}

window.saveWorkspaces = function() {
    localStorage.setItem('notiybot_spaces', JSON.stringify(window.workspaces));
}

window.renderSpacesApp = function() {
    if (!window.activeWorkspaceId && window.workspaces.length > 0) {
        window.activeWorkspaceId = window.workspaces[0].id;
    }
    renderSpacesNav();
    renderActiveSpace();
}

function renderSpacesNav() {
    const navContainer = document.getElementById('spaces-nav-container');
    if (!navContainer) return;
    navContainer.innerHTML = "";

    if (window.workspaces.length === 0) {
        navContainer.innerHTML = `<div class="px-4 py-2 text-sm text-gray-500 italic font-medium">No active workspaces found.</div>`;
        return;
    }

    window.workspaces.forEach(space => {
        const isActive = space.id === window.activeWorkspaceId;
        const bgClass = isActive ? 'bg-blue-600/20 border-blue-500/50 text-blue-100' : 'bg-transparent border-transparent text-gray-400 hover:bg-[#3f3f46] hover:text-gray-200';
        const iconColor = isActive ? 'text-blue-400' : space.color;
        
        navContainer.innerHTML += `
            <button onclick="switchWorkspace('${space.id}')" class="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all whitespace-nowrap ${bgClass}">
                <span class="${iconColor}">${space.icon}</span>
                <span class="font-bold text-sm tracking-wide">${space.name}</span>
                <span class="bg-[#18181b] text-gray-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1 opacity-60">${space.items ? space.items.length : 0}</span>
            </button>
        `;
    });
}

function renderActiveSpace() {
    const container = document.getElementById('active-space-container');
    if (!container) return;

    if (window.workspaces.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center mt-12 fade-in">
                <div class="w-20 h-20 bg-[#242427] rounded-full flex items-center justify-center text-gray-600 mb-6 border border-[#3f3f46] shadow-inner">
                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
                <h2 class="text-2xl font-bold text-white tracking-tight mb-2">No Workspaces Yet</h2>
                <p class="text-gray-400 text-sm max-w-sm mb-8 leading-relaxed">Create your first workspace to start organizing your projects, tasks, and native resources.</p>
                <button onclick="createNewSpace()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-[0_10px_20px_-10px_rgba(59,130,246,0.6)] flex items-center gap-2 hover:scale-105 transform duration-200">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                    Create First Workspace
                </button>
            </div>
        `;
        return;
    }

    const space = window.workspaces.find(s => s.id === window.activeWorkspaceId);
    if (!space) return;

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold text-white tracking-tight" id="active-space-title">${space.name}</h2>
                <span class="bg-[#3f3f46] text-gray-300 text-[10px] font-bold px-2 py-1 rounded-md tracking-wider uppercase">Active</span>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="editWorkspace('${space.id}')" class="w-9 h-9 flex items-center justify-center rounded-xl bg-[#242427] hover:bg-[#3f3f46] border border-[#3f3f46] text-gray-400 hover:text-white transition" title="Edit Workspace"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                <button onclick="deleteWorkspace('${space.id}')" class="w-9 h-9 flex items-center justify-center rounded-xl bg-[#242427] hover:bg-red-500/20 border border-[#3f3f46] text-red-400 hover:text-red-500 hover:border-red-500/50 transition" title="Delete Workspace"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
            </div>
        </div>
        <p class="text-sm text-gray-400 mb-6" id="active-space-desc">${space.description || 'No description provided.'}</p>

        <div>
            <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">ITEMS (<span id="active-space-items-count">${space.items ? space.items.length : 0}</span>)</h3>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-4" id="space-items-grid"></div>
        </div>
    `;

    const grid = document.getElementById('space-items-grid');
    
    if (space.items && space.items.length > 0) {
        space.items.forEach((item, index) => {
            const itemSvg = getItemSvg(item.type);
            grid.innerHTML += `
                <div class="bg-[#242427] border border-[#3f3f46] rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/50 hover:bg-[#2a2a2e] transition cursor-pointer relative" onclick="openItemDetailModal('${space.id}', ${index})">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <div class="w-10 h-10 rounded-xl bg-[#18181b] border border-[#3f3f46] flex items-center justify-center flex-shrink-0 text-gray-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition">
                            ${itemSvg}
                        </div>
                        <div class="flex flex-col overflow-hidden">
                            <span class="text-sm font-bold text-gray-200 truncate group-hover:text-white transition">${item.title}</span>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-300/70">${item.type}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="event.stopPropagation(); triggerDirectItemDelete('${space.id}', ${index})" class="text-[#3f3f46] hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-2" title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            `;
        });
    }

    grid.innerHTML += `
        <button onclick="openAddItemModal('${space.id}')" class="border-2 border-dashed border-[#3f3f46] rounded-2xl p-4 flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 transition group h-[74px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
            <span class="text-sm font-bold">Add Item</span>
        </button>
    `;
}

// WORKSPACE CRUD LOGIC

window.switchWorkspace = function(id) {
    window.activeWorkspaceId = id;
    window.renderSpacesApp();
}

window.deleteWorkspace = function(id) {
    // Basic confirm for workspace deletion
    if(!confirm("Delete entire workspace and all its items?")) return;

    window.workspaces = window.workspaces.filter(s => s.id !== id);
    if (window.activeWorkspaceId === id) {
        window.activeWorkspaceId = window.workspaces.length > 0 ? window.workspaces[0].id : null;
    }
    window.saveWorkspaces();
    window.renderSpacesApp();
    if(window.showToast) window.showToast("Workspace deleted.", "success");
}

window.createNewSpace = function() {
    window.editingSpaceId = null;
    document.getElementById('space-name-input').value = "";
    document.getElementById('space-desc-input').value = "";
    
    const defaultColor = document.querySelector('input[name="space_color"][value="text-blue-400"]');
    if (defaultColor) defaultColor.checked = true;
    
    const defaultIcon = document.querySelector('input[name="space_icon"][value="folder"]');
    if (defaultIcon) defaultIcon.checked = true;

    document.getElementById('space-modal-title-text').innerText = "Create Workspace";
    document.getElementById('space-modal-submit-text').innerText = "Create Space";

    const modal = document.getElementById('modal-create-space');
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('space-modal-content').classList.remove('scale-95');
        setTimeout(() => document.getElementById('space-name-input').focus(), 100);
    }
}

window.editWorkspace = function(id) {
    const space = window.workspaces.find(s => s.id === id);
    if (!space) return;

    window.editingSpaceId = id; 
    document.getElementById('space-name-input').value = space.name;
    document.getElementById('space-desc-input').value = space.description || '';

    const colorRadio = document.querySelector(`input[name="space_color"][value="${space.color}"]`);
    if(colorRadio) colorRadio.checked = true;

    const iconVal = space.iconType || 'folder';
    const iconRadio = document.querySelector(`input[name="space_icon"][value="${iconVal}"]`);
    if(iconRadio) iconRadio.checked = true;

    document.getElementById('space-modal-title-text').innerText = "Edit Workspace";
    document.getElementById('space-modal-submit-text').innerText = "Save Changes";

    const modal = document.getElementById('modal-create-space');
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('space-modal-content').classList.remove('scale-95');
        setTimeout(() => document.getElementById('space-name-input').focus(), 100);
    }
}

window.closeSpaceModal = function() {
    window.editingSpaceId = null;
    const modal = document.getElementById('modal-create-space');
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('space-modal-content').classList.add('scale-95');
    }
}

window.submitNewSpace = function() {
    const name = document.getElementById('space-name-input').value.trim();
    const desc = document.getElementById('space-desc-input').value.trim();
    const colorInput = document.querySelector('input[name="space_color"]:checked');
    const iconInput = document.querySelector('input[name="space_icon"]:checked');
    
    const color = colorInput ? colorInput.value : 'text-blue-400';
    const iconType = iconInput ? iconInput.value : 'folder';

    if (!name) {
        if(window.showToast) window.showToast("Workspace Name is required!", "error");
        return;
    }

    let iconSvg = '';
    switch(iconType) {
        case 'code': iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>'; break;
        case 'design': iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>'; break;
        case 'briefcase': iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>'; break;
        default: iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>';
    }

    if (window.editingSpaceId) {
        const spaceIndex = window.workspaces.findIndex(s => s.id === window.editingSpaceId);
        if (spaceIndex !== -1) {
            window.workspaces[spaceIndex].name = name;
            window.workspaces[spaceIndex].description = desc;
            window.workspaces[spaceIndex].color = color;
            window.workspaces[spaceIndex].iconType = iconType;
            window.workspaces[spaceIndex].icon = iconSvg;
        }
        if(window.showToast) window.showToast(`Workspace updated!`, "success");
    } else {
        const newSpace = {
            id: 'space_' + Date.now(),
            name: name,
            description: desc,
            color: color,
            iconType: iconType,
            icon: iconSvg,
            items: []
        };
        window.workspaces.push(newSpace);
        window.activeWorkspaceId = newSpace.id;
        if(window.showToast) window.showToast(`Workspace created!`, "success");
    }

    window.saveWorkspaces();
    window.closeSpaceModal();
    window.renderSpacesApp();
}

// ITEM CRUD LOGIC & DETAIL VIEW

window.openAddItemModal = function(spaceId) {
    window.activeItemSpaceId = spaceId;
    window.isEditingItem = false;
    
    document.getElementById('item-name-input').value = "";
    document.getElementById('item-target-input').value = "";
    const defaultType = document.querySelector('input[name="item_type"][value="URL"]');
    if (defaultType) defaultType.checked = true;

    document.getElementById('item-modal-title-text').innerText = "Add New Item";
    document.getElementById('item-modal-submit-text').innerText = "Save Item";

    const modal = document.getElementById('modal-add-item');
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('item-modal-content').classList.remove('scale-95');
        setTimeout(() => document.getElementById('item-name-input').focus(), 100);
    }
}

window.closeAddItemModal = function() {
    window.activeItemSpaceId = null;
    window.isEditingItem = false;
    const modal = document.getElementById('modal-add-item');
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('item-modal-content').classList.add('scale-95');
    }
}

window.submitNewItem = function() {
    if (!window.activeItemSpaceId) return;

    const name = document.getElementById('item-name-input').value.trim();
    const target = document.getElementById('item-target-input').value.trim();
    const typeInput = document.querySelector('input[name="item_type"]:checked');
    const type = typeInput ? typeInput.value : 'URL';

    if (!name) {
        if(window.showToast) window.showToast("Item Name is required!", "error");
        return;
    }

    const spaceIndex = window.workspaces.findIndex(s => s.id === window.activeItemSpaceId);
    if (spaceIndex !== -1) {
        if (!window.workspaces[spaceIndex].items) window.workspaces[spaceIndex].items = [];
        
        if (window.isEditingItem && window.activeItemIndex !== null) {
            // Update mode
            window.workspaces[spaceIndex].items[window.activeItemIndex] = { title: name, type: type, url: target };
            if(window.showToast) window.showToast("Item updated successfully!", "success");
        } else {
            // Create mode
            window.workspaces[spaceIndex].items.push({ title: name, type: type, url: target });
            if(window.showToast) window.showToast("Item added successfully!", "success");
        }

        window.saveWorkspaces();
        window.closeAddItemModal();
        window.renderSpacesApp();
        
        // If editing from detail view, update detail view too
        if (window.isEditingItem && !document.getElementById('modal-item-detail').classList.contains('opacity-0')) {
            window.openItemDetailModal(window.activeItemSpaceId, window.activeItemIndex);
        }
    }
}

/** Opens the rich detail view modal for a clicked item */
window.openItemDetailModal = function(spaceId, itemIndex) {
    const space = window.workspaces.find(s => s.id === spaceId);
    if (!space || !space.items || !space.items[itemIndex]) return;

    const item = space.items[itemIndex];
    window.activeItemSpaceId = spaceId;
    window.activeItemIndex = itemIndex;

    document.getElementById('detail-view-icon').innerHTML = getItemSvg(item.type);
    document.getElementById('detail-view-name').innerText = item.title;
    document.getElementById('detail-view-type').innerText = item.type;
    document.getElementById('detail-view-target').innerText = item.url || "No target path specified.";

    const modal = document.getElementById('modal-item-detail');
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('item-detail-content').classList.remove('scale-95');
    }
}

window.closeItemDetailModal = function() {
    const modal = document.getElementById('modal-item-detail');
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('item-detail-content').classList.add('scale-95');
    }
}

/** Prepares the Add modal to be used as an Edit modal */
window.triggerItemEdit = function() {
    const space = window.workspaces.find(s => s.id === window.activeItemSpaceId);
    if (!space) return;
    const item = space.items[window.activeItemIndex];

    window.isEditingItem = true;
    document.getElementById('item-name-input').value = item.title;
    document.getElementById('item-target-input').value = item.url || '';
    
    const typeRadio = document.querySelector(`input[name="item_type"][value="${item.type}"]`);
    if(typeRadio) typeRadio.checked = true;

    document.getElementById('item-modal-title-text').innerText = "Edit Item";
    document.getElementById('item-modal-submit-text').innerText = "Save Changes";

    window.closeItemDetailModal();

    setTimeout(() => {
        const modal = document.getElementById('modal-add-item');
        if(modal) {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            document.getElementById('item-modal-content').classList.remove('scale-95');
            setTimeout(() => document.getElementById('item-name-input').focus(), 100);
        }
    }, 100);
}

/** Triggers native launch behavior (Electron integration required for full effect) */
window.launchCurrentItem = function() {
    const space = window.workspaces.find(s => s.id === window.activeItemSpaceId);
    const item = space.items[window.activeItemIndex];
    
    if (window.showToast) window.showToast(`Launching ${item.title}...`, "success");
    
    // Check if running inside Electron, then launch the URL/App
    try {
        const { shell } = require('electron');
        if (item.url.startsWith('http')) {
            shell.openExternal(item.url);
        } else {
            shell.openPath(item.url);
        }
    } catch(e) {
        console.log("Desktop shell integration not active. Simulated launch:", item.url);
    }
}

// SAFE DELETION (CONFIRMATION MODAL)

/** Called from hover button on grid card */
window.triggerDirectItemDelete = function(spaceId, itemIndex) {
    window.activeItemSpaceId = spaceId;
    window.activeItemIndex = itemIndex;
    openConfirmDeleteModal();
}

/** Called from the red button inside the Detail View Modal */
window.triggerItemDelete = function() {
    // context is already set when opening detail view
    openConfirmDeleteModal();
}

function openConfirmDeleteModal() {
    const modal = document.getElementById('modal-confirm-delete');
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('confirm-delete-content').classList.remove('scale-95');
    }
}

window.closeConfirmDeleteModal = function() {
    const modal = document.getElementById('modal-confirm-delete');
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('confirm-delete-content').classList.add('scale-95');
    }
}

window.executeItemDeletion = function() {
    const space = window.workspaces.find(s => s.id === window.activeItemSpaceId);
    if (space && space.items) {
        space.items.splice(window.activeItemIndex, 1);
        window.saveWorkspaces();
        window.renderSpacesApp();
        
        closeConfirmDeleteModal();
        closeItemDetailModal(); // Close detail view if it was open
        
        if(window.showToast) window.showToast("Item permanently deleted.", "success");
    }
}

// OBSERVER
const spacesDomObserver = new MutationObserver(() => {
    const navContainer = document.getElementById('spaces-nav-container');
    if (navContainer && !navContainer.hasAttribute('data-rendered')) {
        navContainer.setAttribute('data-rendered', 'true');
        window.renderSpacesApp();
    }
});
spacesDomObserver.observe(document.body, { childList: true, subtree: true });
window.addEventListener('tabSwitched', function(e) {
    if (e.detail === 'spaces') {
        setTimeout(window.renderSpacesApp, 150); 
    }
});