import {
    showSuccess,
    showError,
    showWarning,
    confirmAction
} from "/utils/swalUtils.js";

document.addEventListener("DOMContentLoaded", () => {
    loadUsers(1);

    const searchInput = document.querySelector(".search-input");
    const clearIcon = document.getElementById("clearSearchIcon");

    // Live search
    searchInput.addEventListener("input", () => {
        clearIcon.style.display = searchInput.value ? "block" : "none";
        loadUsers(1);
    });
});
async function loadUsers(page) {
    const search = document.querySelector(".search-input").value;

    const res = await axios.get(`/api/admin/users/data?page=${page}&search=${search}`);
    const data = res.data;

    renderTable(data.users, data.currentPage, data.usersPerPage);
    renderPagination(data.totalUsers, data.currentPage, data.usersPerPage);
}

function renderTable(users, page, limit) {
    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML = "";

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-users">No users found</td>
            </tr>
        `;
        return;
    }

    users.forEach((user, index) => {
        const row = `
            <tr>
                <td>${(page - 1) * limit + (index + 1)}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role || "Customer"}</td>
                <td>
                    ${user.isBlocked
                ? `<span class="status-badge status-blocked">blocked</span>`
                : `<span class="status-badge status-active">active</span>`}
                </td>
                <td>${new Date(user.createdAt).toLocaleDateString("en-GB")}</td>
                <td>
                    ${user.isBlocked
                ? `<button class="action-btn action-unblock" data-id="${user._id}">
           <i data-lucide="check"></i>
       </button>`
                : `<button class="action-btn action-block" data-id="${user._id}">
           <i data-lucide="ban"></i>
       </button>`
            }

                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    lucide.createIcons();
}

function renderPagination(total, page, limit) {
    const container = document.getElementById("paginationContainer");
    container.innerHTML = "";

    const totalPages = Math.ceil(total / limit);

    if (totalPages <= 1) {
        container.style.display = "none";
        return;
    }

    // Otherwise show pagination
    container.style.display = "flex";

    // PREVIOUS BUTTON
    if (page > 1) {
        container.innerHTML += `
            <button class="page-btn" data-page="${page - 1}">Prev</button>
        `;
    }

    // PAGE NUMBERS
    for (let i = 1; i <= totalPages; i++) {
        container.innerHTML += `
            <button class="page-btn ${i === page ? "active" : ""}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    // NEXT BUTTON
    if (page < totalPages) {
        container.innerHTML += `
            <button class="page-btn" data-page="${page + 1}">Next</button>
        `;
    }
}


async function blockUser(id) {
    confirmAction("Block this user?", async () => {
        try {
            await axios.patch(`/api/admin/users/block/${id}`);
            showSuccess("User blocked successfully");
            loadUsers(1);
        } catch (err) {
            showError(err.response?.data?.message || "Failed to block user");
        }
    });
}

async function unblockUser(id) {
    confirmAction("Unblock this user?", async () => {
        try {
            await axios.patch(`/api/admin/users/unblock/${id}`);
            showSuccess("User unblocked successfully");
            loadUsers(1);
        } catch (err) {
            showError(err.response?.data?.message || "Failed to unblock user");
        }
    });
}


function clearSearch() {
    document.querySelector(".search-input").value = "";
    loadUsers(1); // Reload results
    window.history.replaceState({}, "", "/admin/users"); // Remove search query from URL
}


document.addEventListener("click", (e) => {

    // CLEAR SEARCH ICON CLICKED
    const clearIcon = e.target.closest("#clearSearchIcon");
    if (clearIcon) {
        clearSearch();
        return;
    }

    // BLOCK USER
    const blockBtn = e.target.closest(".action-block");
    if (blockBtn) {
        const id = blockBtn.dataset.id;
        blockUser(id);
        return;
    }

    // UNBLOCK USER
    const unblockBtn = e.target.closest(".action-unblock");
    if (unblockBtn) {
        const id = unblockBtn.dataset.id;
        unblockUser(id);
        return;
    }

    // PAGINATION
    const pageBtn = e.target.closest(".page-btn");
    if (pageBtn) {
        const page = Number(pageBtn.dataset.page);
        loadUsers(page);
        return;
    }
});


