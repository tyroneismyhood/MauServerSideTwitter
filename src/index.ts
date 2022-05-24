import 'dotenv/config'
import TwitterApi from 'twitter-api-v2'
import axios from 'axios'
import twitterTrackers from './twitterTrackers'

async function run() {
	if (process.env.NODE_ENV == 'development') {
		axios.defaults.baseURL = 'http://localhost:3000/api/twitter'
	} else {
		axios.defaults.baseURL = 'https://twitterfollowingcheck.herokuapp.com/api/twitter/user-following'
	}

	axios.defaults.headers.common['Authorization'] = process.env.AUTH as string

	for (const tracker of twitterTrackers) {
		const twitterClient = new TwitterApi(tracker.token as string)
		if (!twitterClient) {
			continue
		}

		let userId = await twitterClient.v2
			.userByUsername(tracker.username)
			.then((res) => res.data.id)
			.catch(() => {})

		if (userId) {
			continue
		}

		console.log(tracker)

		const cache = new Set()
		let firstRun = true

		setInterval(async () => {
			const followers = await twitterClient.v2
				.followers(userId as string, {
					max_results: 1000,
				})
				.then((res) => res.data)
				.catch((err) => {
					return
				})

			if (!followers) {
				console.log(`rate limited - ${tracker.username}`)
				return
			}

			let filteredFollowers: any = followers.filter(
				(follower) => !cache.has(follower.username),
			)
			filteredFollowers = filteredFollowers.map((follower: any) => {
				cache.add(follower.username)
				return follower.username
			})

			if (filteredFollowers.length <= 0) {
				console.log(`no new followers - ${tracker.username}`)
				return
			}

			if (firstRun) {
				console.log('Tracker initiated - ' + tracker.username)
				firstRun = false
			} else {
				axios({
					method: 'post',
					url: `/user-following?following=${tracker.username}`,
					headers: {
						Authorization: process.env.AUTH,
					},
					data: filteredFollowers,
				}).catch(console.warn)

				console.log(`Ran for - ${tracker.username}`)
			}
		}, 1000 * 60 * 2)
	}
}

run()
