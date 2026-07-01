document.addEventListener('DOMContentLoaded', () => {
    const addProductForm = document.querySelector('#addProductForm')
    const categorySelect = document.querySelector('#categorySelect')
    const addProductMessage = document.querySelector('#addProductMessage')
    const cancelAddProduct = document.querySelector('#cancelAddProduct')

    const apiBase = '/api'

    const showMessage = (message, type = 'success') => {
        addProductMessage.textContent = message
        addProductMessage.className = type === 'success' ? 'text-success' : 'text-danger'
    }

    const resetForm = () => {
        addProductForm.reset()
        addProductMessage.textContent = ''
    }

    const loadCategories = async () => {
        try {
            const res = await fetch(`${apiBase}/categories`)
            const data = await res.json()
            if (!res.ok || !data.categories) {
                showMessage('Unable to load categories.', 'error')
                return
            }

            categorySelect.innerHTML = '<option value="">Select category</option>'
            data.categories.forEach((category) => {
                const option = document.createElement('option')
                option.value = category.id
                option.textContent = category.name
                categorySelect.appendChild(option)
            })
        } catch (error) {
            console.error(error)
            showMessage('Failed to fetch categories.', 'error')
        }
    }

    addProductForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        showMessage('')

        const productData = {
            name: document.querySelector('#productName').value.trim(),
            sku: document.querySelector('#productSku').value.trim(),
            category_id: categorySelect.value || null,
            quantity: parseInt(document.querySelector('#productQuantity').value, 10) || 0,
            price: parseFloat(document.querySelector('#productPrice').value) || 0.0,
            status: document.querySelector('#productStatus').value,
            supplier: document.querySelector('#productSupplier').value.trim(),
            description: document.querySelector('#productDescription').value.trim(),
        }

        if (!productData.name || !productData.sku) {
            showMessage('Product name and SKU are required.', 'error')
            return
        }

        try {
            const response = await fetch(`${apiBase}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData),
            })
            const result = await response.json()

            if (!response.ok) {
                showMessage(result.error || 'Unable to save product.', 'error')
                return
            }

            showMessage('Product created successfully.', 'success')
            addProductForm.reset()
        } catch (error) {
            console.error(error)
            showMessage('Failed to create product.', 'error')
        }
    })

    cancelAddProduct.addEventListener('click', (event) => {
        event.preventDefault()
        resetForm()
    })

    loadCategories()
})
