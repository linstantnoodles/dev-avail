var req = require("request"),
    async = require("async");

// User repos
var options = {
    url: 'https://api.github.com/users/linstantnoodles/repos?per_page=200',
    headers: {
        'User-Agent': 'schedule'
    }
};

// Get commit count of a repo of owner
var getTotalCommits = function(users) {
  if (users.length != 1) {
    return 0;
  }
  return users.pop()["total"];
}

// Get recent repos
var pickRecent = function(data) {
  // Most recent date comes first
  // This means highest #
  // aka sorting by DESC
  return data.sort(function(a, b) {
    var a_lastpush = a["pushed_at"];
    var b_lastpush = b["pushed_at"];
    if (a_lastpush > b_lastpush) {
      return -1;
    } else if (a_lastpush < b_lastpush) {
      return 1;
    } else {
      return 0;
    }
  }).slice(0,5).map(function(a) {
    return {
      name: a["name"]
    }
  });
};

var getCommitData = function(latest, callback) {
  // Prepare requests
  var commitRequests = [];
  for (var i = 0; i < latest.length; i++) {
    commitRequests.push(function(repo) {
      return function(callback) {
        var name = repo["name"];
        var options = {
          url: 'https://api.github.com/repos/linstantnoodles/' + name + '/stats/contributors',
          headers: {
            'User-Agent': 'schedule'
          }
        };
        req(options, function(error, res, body) {
          var data = JSON.parse(body);
          var totalCommits = getTotalCommits(data);
          repo["total"] = totalCommits;
          callback(null, data);
        });
      };
    }(latest[i]));
  };
  async.parallel(commitRequests, callback);
};

// Fire request
req(options, function(error, res, body) {
  if (error || res.statusCode != 200) {
    console.log(res);
    return;
  }
  // Get recent repos
  var latest = pickRecent(JSON.parse(body));
  getCommitData(latest, function(err, results) {
    // Sort by commit
    console.log(latest);
    var target = latest.sort(function(a, b) {
      return a["total"] - b["total"];
    }).pop();
    // Get the schedule
    var options = {
      url: 'https://api.github.com/repos/linstantnoodles/' + target["name"] + '/stats/punch_card',
      headers: {
        'User-Agent': 'schedule'
      }
    };

    req(options, function(error, res, body) {
      if (error || res.statusCode != 200) {
        console.log(res);
        return;
      }

      console.log("Based on repo: " + target["name"]);
      var data = JSON.parse(body);
      console.log(data);
    });
  });
});
