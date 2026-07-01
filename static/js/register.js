const registerForm = document.querySelector("#registerForm")
const registerError = document.querySelector("#registerError")
const registerSuccess = document.querySelector("#registerSuccess")

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    registerError.textContent = ""
    registerSuccess.textContent = ""

    const formData = new FormData(registerForm)
    const data = Object.fromEntries(formData)

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })

        const result = await response.json()

        if (!response.ok) {
            registerError.textContent = result.error || "Registration failed."
            return
        }

        registerSuccess.textContent = result.message || "Registration successful. Redirecting to login..."
        setTimeout(() => {
            window.location.href = "/"
        }, 1200)
    } catch (error) {
        registerError.textContent = "Unable to complete registration. Please try again."
        console.error(error)
    }
})
