
const loginForm = document.querySelector("#loginForm")
const loginError = document.createElement("div")
loginError.id = "loginError"
loginError.className = "text-danger text-center mt-3"
loginForm.appendChild(loginError)

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    loginError.textContent = ""

    const formData = new FormData(loginForm)
    const data = Object.fromEntries(formData)

    try {
        const response = await fetch("/signIn", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })

        const result = await response.json()

        if (!response.ok) {
            loginError.textContent = result.error || "Login failed."
            return
        }

        window.location.href = "/dashboard"
    } catch (error) {
        loginError.textContent = "Unable to login. Please try again."
        console.error(error)
    }
})