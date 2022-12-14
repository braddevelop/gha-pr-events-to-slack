const core = require('@actions/core')
const github = require('@actions/github');

const context = github.context;

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

    const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        // mediaType: {
        //   format: 'diff'
        // }
    });

    console.log(pullRequest);
    core.notice('Done...')
}

run();