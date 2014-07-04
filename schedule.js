var req = require("request"),
    async = require("async");

// User repos
var options = {
    url: 'https://api.github.com/users/linstantnoodles/repos',
    headers: {
        'User-Agent': 'schedule'
    }
};

// Get commit count of a repo
var getTotalCommits = function(users) {
  var total = 0;
  for (var i = 0; i < users.length; i++) {
    total += users[i]["total"];
  }
  return total;
}

req(options, function(error, res, body) {
  if (!error && res.statusCode == 200) {
    var data = JSON.parse(body);
    // Most recent date comes first
    // This means highest #
    // aka sorting by DESC
    data.sort(function(a, b) {
      var a_lastpush = a["pushed_at"];
      var b_lastpush = b["pushed_at"];
      if (a_lastpush > b_lastpush) {
        return -1;
      } else if (a_lastpush < b_lastpush) {
        return 1;
      } else {
        return 0;
      }
    });

    // Get first 5
    var latest = data.slice(0, 5).map(function(a) {
      return {
        name: a["name"],
        commits: []
      }
    });

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
          });
        };
      }(latest[i]));
    };
    async.parallel(commitRequests, function(err, results) {
      // Sort by commit
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
        var data = JSON.parse(body);
        // Profit
        console.log(data);
      });

    });
  } else {
    console.log(res);
  }
});
