const bcrypt = require('bcrypt');
const password = "SecureP@ss12";
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) throw err;
    console.log("HASH=" + hash);
});
