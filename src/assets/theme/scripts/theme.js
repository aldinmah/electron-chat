window.onload = function () {    
    var darkThemeBtn = document.getElementById('darkTheme');
    darkThemeBtn.onclick = function (event) {
        event.preventDefault();
        document.body.classList.remove("lightTheme");
        localStorage.setItem('lightTheme',false)
        return false;
    }
    
    var lightThemeBtn = document.getElementById('lightTheme');
    lightThemeBtn.onclick = function (event) {
        event.preventDefault();
        document.body.classList.add("lightTheme");
        localStorage.setItem('lightTheme',true)
        return false;
    }
}