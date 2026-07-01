document.addEventListener('DOMContentLoaded', () => {
    const categoryTableBody = document.querySelector('#categoryTableBody')
    const categorySearchInput = document.querySelector('#categorySearchInput')
    const categoryMessage = document.querySelector('#categoryMessage')
    const createCategoryBtn = document.querySelector('#createCategoryBtn')
    const newCategoryName = document.querySelector('#newCategoryName')
    const newCategoryDescription = document.querySelector('#newCategoryDescription')
    const newCategoryStatus = document.querySelector('#newCategoryStatus')

    const apiBase = '/api'
    let categories = []

    const showMessage = (message, type = 'success') => {
        categoryMessage.textContent = message
        categoryMessage.className = type === 'success' ? 'text-success' : 'text-danger'
    }

    const renderCategories = (list) => {
        categoryTableBody.innerHTML = ''
        if (!list.length) {
            categoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No categories found.</td></tr>'
            return
        }

        list.forEach((category) => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${category.name}</td>
                <td>${category.description || ''}</td>
                <td>${category.status === 'active' ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-light me-2" data-action="edit" data-id="${category.id}">Edit</button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${category.id}">Delete</button>
                </td>
            `
            categoryTableBody.appendChild(tr)
        })
    }

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${apiBase}/categories`)
            const data = await res.json()
            if (!res.ok || !data.categories) {
                showMessage('Unable to load categories.', 'error')
                return
            }
            categories = data.categories
            renderCategories(categories)
        } catch (error) {
            console.error(error)
            showMessage('Failed to load categories.', 'error')
        }
    }

    const createCategory = async () => {
        const name = newCategoryName.value.trim()
        const description = newCategoryDescription.value.trim()
        const status = newCategoryStatus.value

        if (!name) {
            showMessage('Category name is required.', 'error')
            return
        }

        try {
            const res = await fetch(`${apiBase}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description, status }),
            })
            const result = await res.json()
            if (!res.ok) {
                showMessage(result.error || 'Unable to create category.', 'error')
                return
            }
            showMessage('Category created successfully.', 'success')
            newCategoryName.value = ''
            newCategoryDescription.value = ''
            newCategoryStatus.value = 'active'
            fetchCategories()
        } catch (error) {
            console.error(error)
            showMessage('Failed to create category.', 'error')
        }
    }

    const deleteCategory = async (categoryId) => {
        if (!confirm('Delete this category?')) return
        try {
            const res = await fetch(`${apiBase}/categories/${categoryId}`, {
                method: 'DELETE',
            })
            const result = await res.json()
            if (!res.ok) {
                showMessage(result.error || 'Unable to delete category.', 'error')
                return
            }
            showMessage('Category deleted.', 'success')
            fetchCategories()
        } catch (error) {
            console.error(error)
            showMessage('Failed to delete category.', 'error')
        }
    }

    categoryTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button')
        if (!button) return
        const action = button.dataset.action
        const id = button.dataset.id
        if (action === 'delete') {
            await deleteCategory(id)
        }
        if (action === 'edit') {
            const category = categories.find((item) => item.id === id)
            if (!category) return
            const updatedName = prompt('Category name', category.name)
            const updatedDescription = prompt('Description', category.description || '')
            const updatedStatus = prompt('Status (active/inactive)', category.status)
            if (updatedName === null || updatedStatus === null) return
            try {
                const res = await fetch(`${apiBase}/categories/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: updatedName.trim(),
                        description: updatedDescription.trim(),
                        status: updatedStatus.trim() || category.status,
                    }),
                })
                const result = await res.json()
                if (!res.ok) {
                    showMessage(result.error || 'Unable to update category.', 'error')
                    return
                }
                showMessage('Category updated successfully.', 'success')
                fetchCategories()
            } catch (error) {
                console.error(error)
                showMessage('Failed to update category.', 'error')
            }
        }
    })

    categorySearchInput.addEventListener('input', () => {
        const filter = categorySearchInput.value.trim().toLowerCase()
        const filtered = categories.filter((category) =>
            category.name.toLowerCase().includes(filter) ||
            (category.description || '').toLowerCase().includes(filter)
        )
        renderCategories(filtered)
    })

    createCategoryBtn.addEventListener('click', createCategory)
    fetchCategories()
})
