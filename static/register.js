document.addEventListener('DOMContentLoaded', () =>{
    const registerform = document.getElementById('register') ;
    const seePassword = document.getElementById('seePassword');
    const passwordInput = document.getElementById('password');

    seePassword.addEventListener('click',  function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
        passwordInput.setAttribute('type', type);

        this.textContent = type === 'text' ? '🔓' : '🔒'

    })

    registerform.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formdata = new FormData(registerform);

        const email =formdata.get('email');
        const name = formdata.get('name');
        const username =formdata.get('username');
        const password = formdata.get('password');

        const message = document.getElementById('message')
        message.textContent='';
        message.style.display = 'none';
        // setTimeout(() => {
        //     message.style.display = 'none'; 
        // }, 5000);
        

        if (username.length < 3) {
            message.textContent ='Username must be at least 3 characters long.';
            message.style.display ='block';
            return;
        }

        if(password.length < 8){
            message.textContent ='Password must be 8 or more characters';
            message.style.display ='block';
         }

        const uppercasePattern = /[A-Z]/;
        const specialCharacterPattern = /[!@#$%^&*(),.?":{}|<>]/;

        if (!uppercasePattern.test(password)) {
           message.textContent ='Password must contain at least one uppercase letter.';
           message.style.display ='block';
            return;
        }

        if (!specialCharacterPattern.test(password)) {
           message.textContent ='Password must contain at least one special character.';
           message.style.display ='block';
            return;
        }

        
         try {
            const response = await fetch('/register',{
                method:'POST',
                headers:{
                    'Content-Type': 'application/json'
                },
                body:JSON.stringify({email,name,username,password})

            })


            if(response.ok){
                const responseData = await response.json();
                message.textContent = responseData.message;
                registerform.reset();
                message.style.display = 'block';
                // message.textContent = 'reg success'

                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
            else{
                const errorData = await response.json();
                message.textContent = errorData.error || 'Registration failed';
                message.style.display = 'block';
            }
         } catch (error) {
            console.log('Error', +error)
            message.textContent = 'An error occurred during registration.';
            message.style.display = 'block';
         }

         
    })
  
})