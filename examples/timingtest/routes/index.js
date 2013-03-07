var pageData = { title: 'socket.io stress tester'};

exports.index = function(req, res){
  res.render('index', pageData);
};

exports.sender = function(req, res) {
  res.render('sender', pageData);
}

exports.receiver = function (req, res) {
  res.render('receiver', pageData);
}