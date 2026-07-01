document.addEventListener('DOMContentLoaded', () => {
    const productTableBody = document.querySelector('#productTableBody')
    const searchInput = document.querySelector('#searchInput')
    const categoryFilter = document.querySelector('#categoryFilter')
    const statusFilter = document.querySelector('#statusFilter')
    const sortSelect = document.querySelector('#sortSelect')
    const clearFiltersBtn = document.querySelector('#clearFiltersBtn')
    const productMessage = document.querySelector('#productMessage')

    const apiBase = '/api'
    let products = []
    let categories = []

    const showMessage = (message, type = 'success') => {
        productMessage.textContent = message
        productMessage.className = type === 'success' ? 'text-success' : 'text-danger'
    }

    const buildQuery = () => {
        const params = new URLSearchParams()
        if (categoryFilter.value) params.append('category_id', categoryFilter.value)
        if (statusFilter.value) params.append('status', statusFilter.value)
        if (searchInput.value.trim()) params.append('search', searchInput.value.trim())
        return params.toString() ? `?${params.toString()}` : ''
    }

    const sortProducts = (list) => {
        switch (sortSelect.value) {
            case 'name':
                return [...list].sort((a, b) => a.name.localeCompare(b.name))
            case 'price-low':
                return [...list].sort((a, b) => a.price - b.price)
            case 'price-high':
                return [...list].sort((a, b) => b.price - a.price)
            case 'stock':
                return [...list].sort((a, b) => a.quantity - b.quantity)
            case 'category':
                return [...list].sort((a, b) => {
                    const aName = a.category?.name || ''
                    const bName = b.category?.name || ''
                    return aName.localeCompare(bName)
                })
            default:
                return list
        }
    }

    const renderProducts = (list) => {
        productTableBody.innerHTML = ''
        if (!list.length) {
            productTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No products found.</td></tr>'
            return
        }

        list.forEach((product) => {
            const statusBadge = product.status === 'in stock'
                ? '<span class="badge bg-success">In Stock</span>'
                : product.status === 'low stock'
                    ? '<span class="badge bg-warning text-dark">Low Stock</span>'
                    : '<span class="badge bg-danger">Out of Stock</span>'

            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${product.name}</td>
                <td>${product.sku}</td>
                <td>${product.category?.name || 'Uncategorized'}</td>
                <td>${product.quantity}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-light me-2" data-action="edit" data-id="${product.id}">Edit</button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${product.id}">Delete</button>
                </td>
            `
            productTableBody.appendChild(tr)
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
            categoryFilter.innerHTML = '<option value="">All Categories</option>'
            categories.forEach((category) => {
                const option = document.createElement('option')
                option.value = category.id
                option.textContent = category.name
                categoryFilter.appendChild(option)
            })
        } catch (error) {
            console.error(error)
            showMessage('Failed to load categories.', 'error')
        }
    }

    const fetchProducts = async () => {
        try {
            const query = buildQuery()
            const res = await fetch(`${apiBase}/products${query}`)
            const data = await res.json()
            if (!res.ok || !data.products) {
                showMessage('Unable to load products.', 'error')
                return
            }
            products = data.products
            renderProducts(sortProducts(products))
        } catch (error) {
            console.error(error)
            showMessage('Failed to load products.', 'error')
        }
    }

    const deleteProduct = async (productId) => {
        if (!confirm('Delete this product?')) return
        try {
            const res = await fetch(`${apiBase}/products/${productId}`, { method: 'DELETE' })
            const result = await res.json()
            if (!res.ok) {
                showMessage(result.error || 'Unable to delete product.', 'error')
                return
            }
            showMessage('Product deleted successfully.', 'success')
            fetchProducts()
        } catch (error) {
            console.error(error)
            showMessage('Failed to delete product.', 'error')
        }
    }

    productTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button')
        if (!button) return
        const action = button.dataset.action
        const id = button.dataset.id
        if (action === 'delete') {
            await deleteProduct(id)
            return
        }
        if (action === 'edit') {
            const product = products.find((item) => item.id === id)
            if (!product) return
            const newName = prompt('Product name', product.name)
            const newSku = prompt('SKU', product.sku)
            if (newName === null || newSku === null) return
            const categoryId = prompt('Category ID', product.category?.id || '')
            const quantity = prompt('Quantity', product.quantity)
            const price = prompt('Price', product.price)
            const status = prompt('Status (in stock, low stock, out of stock)', product.status)
            if (status === null) return
            try {
                const res = await fetch(`${apiBase}/products/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: newName.trim(),
                        sku: newSku.trim(),
                        category_id: categoryId || undefined,
                        quantity: parseInt(quantity, 10) || product.quantity,
                        price: parseFloat(price) || product.price,
                        status: status.trim() || product.status,
                    }),
                })
                const result = await res.json()
                if (!res.ok) {
                    showMessage(result.error || 'Unable to update product.', 'error')
                    return
                }
                showMessage('Product updated successfully.', 'success')
                fetchProducts()
            } catch (error) {
                console.error(error)
                showMessage('Failed to update product.', 'error')
            }
        }
    })

    searchInput.addEventListener('input', fetchProducts)
    categoryFilter.addEventListener('change', fetchProducts)
    statusFilter.addEventListener('change', fetchProducts)
    sortSelect.addEventListener('change', () => renderProducts(sortProducts(products)))
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = ''
        categoryFilter.value = ''
        statusFilter.value = ''
        sortSelect.value = ''
        fetchProducts()
    })

    fetchCategories().then(fetchProducts)
})
