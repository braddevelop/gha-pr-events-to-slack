const core = require('@actions/core')
const github = require('@actions/github');

const context = github.context;



function getLastReview(reviews){
    if(reviews && reviews.length){
        return reviews[reviews.length-1]
    }
}


async function run(){
    // if: github.event_name == 'pull_request_review' && github.event.review.state != 'approved' && github.event.pull_request.base.ref == 'master'.
    // if(context.eventName == 'pull_request_review' && context.)
    // context.payload.pull_request.html_url
    // core.notice('Running@111...')

    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // repoAccessToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    const repoAccessToken = core.getInput('repoAccessToken');
    const pullNumber = core.getInput('pullNumber');
    const repo = core.getInput('repo');
    const owner = core.getInput('owner');

    const octokit = github.getOctokit(repoAccessToken)

    // You can also pass in additional options as a second parameter to getOctokit
    // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

    /**
     * 
     * 
     * 
     data: [
    {
      id: 1215809276,
      node_id: 'PRR_kwDOIlNd3s5Id8b8',
      user: [Object],
      body: 'this is the new noise',
      state: 'CHANGES_REQUESTED',
      html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1215809276',
      pull_request_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
      author_association: 'OWNER',
      _links: [Object],
      submitted_at: '2022-12-13T16:05:55Z',
      commit_id: '476ca9b4857051e288a44df44c1872317f48fe5c'
    },
    {
      id: 1215824992,
      node_id: 'PRR_kwDOIlNd3s5IeARg',
      user: [Object],
      body: 'asvafavaf',
      state: 'CHANGES_REQUESTED',
      html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1215824992',
      pull_request_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
      author_association: 'OWNER',
      _links: [Object],
      submitted_at: '2022-12-13T16:10:09Z',
      commit_id: '476ca9b4857051e288a44df44c1872317f48fe5c'
    },
    {
      id: 1216329973,
      node_id: 'PRR_kwDOIlNd3s5If7j1',
      user: [Object],
      body: 'suki CR',
      state: 'CHANGES_REQUESTED',
      html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1216329973',
      pull_request_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
      author_association: 'OWNER',
      _links: [Object],
      submitted_at: '2022-12-13T19:54:34Z',
      commit_id: '476ca9b4857051e288a44df44c1872317f48fe5c'
    }
  ]
     */

    const { data: pullRequestReviews } = await octokit.rest.pulls.listReviews({
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        // mediaType: {
        //   format: 'diff'
        // }
    }).then(console.log, console.log); // remove for prod

    console.log(pullRequestReviews);
    const lastReview = getLastReview(pullRequestReviews);

    switch (lastReview.state) {
        case 'CHANGES_REQUESTED':
            core.setOutput('slackMessage', 'Output a slack template for CHANGES_REQUESTED')            
            break;
    
        default:
            break;
    }


    core.notice('Done...')
}

run();