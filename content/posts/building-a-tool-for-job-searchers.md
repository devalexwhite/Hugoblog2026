{
  "title": "Building a Tool for Job Searchers",
  "date": "2026-10-19T12:11:00-04:00",
  "url": "/building-a-tool-for-job-searchers/",
  "tags": [
    "Development",
    "Life"
  ],
  "description": "The job search process can be chaotic, stressful and scary. It's easy to lose track of the progress you've made in a sea of rejection emails. As you progress through the stages, it becomes important to keep track of everyone you talked to a",
  "cover": "https://imgs.xkcd.com/comics/automation.png",
  "comments": true,
  "source": "https://thatalexguy.dev/building-a-tool-for-job-searchers"
}

The job search process can be chaotic, stressful and scary. It's easy to lose track of the progress you've made in a sea of rejection emails. As you progress through the stages, it becomes important to keep track of everyone you talked to and what you discussed. When you have multiple applications going at once, it can become messy!

## JobCaddy

Like any good engineer, I decided to build my own solution! Mostly as a way to keep my mind busy and stay on top of AI tooling, but also because I believe there's real value to a tool that brings notes, scheduling and a CRM into one job search focused package.

![Relevant XKCD](https://imgs.xkcd.com/comics/automation.png) _[Source - XKCD](https://xkcd.com/1319/)_

I'm calling my project JobCaddy. As of right now it focuses on helping job seekers track where they've applied to, the various stages they've gone through and the people behind each stage.

![JobCaddy Home Page](/content/images/building-a-tool-for-job-searchers/screenshot-home-page.webp) _Test account with fake data_

My eventual goal is to add suggestions on actions you should take. One thing I learned as a hiring manager is that many people forget to focus on the human aspect of the process. The conversations and people you meet are extremely important. As you progress through stages at a company, you should be sending thank personalized thank you letters, referencing previous conversations and able to recall the name of each person you talked to. JobCaddy will act as a mentor of sorts, suggesting follow-ups and helping you prep for next stages based on your notes and people you talked to.

![Screenshot of JobCaddy application timeline](/content/images/building-a-tool-for-job-searchers/Screenshot-2026-10-19-at-12-07-00-Dashboard-Jobcaddy.webp) _Test account with fake data_

## How I'm Building It

Like I said, this is in part a project for me to stay on-top of AI developments while I'm job searching. I'm using Next.JS deployed on Vercel with a Supabase backend and shadcn/ui for components. I'm building it primarily with Codex and have been leveraging the [impeccable skill for styling](https://impeccable.style/).

My workflow revolves around the Codex CLI in [Herdr](https://herdr.dev/), dictation via [Myse](/trying-myna-on-ubuntu-2610) on Ubuntu and tooling management via [Mise](https://mise.jdx.dev/). I leverage Sublime Text for manual coding.

![Screenshot of Herdr CLI with Codex](/content/images/building-a-tool-for-job-searchers/sublime.webp)

It's been a pretty fun process, allowing me to quickly iterate based on pain points I run into while using JobCaddy for my own job search!
