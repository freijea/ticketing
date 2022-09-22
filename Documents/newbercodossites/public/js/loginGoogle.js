const url = window.location.href
const urlArray = url.split('/');
const domain = `${urlArray[0]}//${urlArray[2]}`;


const onSuccess = async (googleUser) => {
    const profile = googleUser.getBasicProfile();
    const idToken = googleUser.getAuthResponse().id_token;

    const login = await axios({
        method: 'post',
        url: `${domain}/api/v1/usuarios/logargoogle`,
        data: {
            idToken
        }
      });

      if(login.data.status === 'success') {
        window.setTimeout(() => {
            location.assign('/')
        }, 10);
     } 

};


function onFailure(error) {
    alert(err.response.data.message);
}

function renderButton() {
    gapi.signin2.render('my-signin2', {
      'scope': 'profile email',
      'width': 240,
      'height': 50,
      'longtitle': true,
      'theme': 'dark',
      'onsuccess': onSuccess,
      'onfailure': onFailure
    });
};

const signOut = async () => {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
      console.log('User signed out.');
    });

    const logout = await axios({
        method: 'get',
        url: `${domain}/api/v1/usuarios/logout`
    });

    console.log(logout.data);


    if(logout.data.status === 'success') {
        window.setTimeout(() => {
            location.assign('/')
        }, 10);
     }
}

function onLoad() {
    gapi.load('auth2', function() {
        gapi.auth2.init();
      });
}
