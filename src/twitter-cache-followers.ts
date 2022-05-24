import 'dotenv/config'
import TwitterApi from 'twitter-api-v2'
import axios from 'axios'
import twitterTrackers from './twitterTrackers'

let user = 'tyroneismyhood'
let testToken = ''

async function run() {
	axios.defaults.baseURL = 'https://twitterdings.vercel.app/api/twitter'
	axios.defaults.headers.common['Authorization'] = process.env.AUTH as string

	for (const tracker of twitterTrackers) {
		if (tracker.username === user) {
			const twitterClient = new TwitterApi(tracker.token as string)
			// const twitterClient = new TwitterApi(testToken)
			if (!twitterClient) {
				continue
			}

			let userId = await twitterClient.v2
				.userByUsername(tracker.username)
				.then((res) => res.data.id)
				.catch(() => {})

			if (!userId) {
				continue
			}

			let followers = await twitterClient.v2.followers(userId, {
				max_results: 1000,
				asPaginator: true,
			})

			// await followers.fetchLast(12000)

			if (!followers) {
				console.log(`rate limited - ${tracker.username}`)
				return
			}

			let filteredFollowers: any = followers.data.data

			filteredFollowers = filteredFollowers.map((follower: any) => {
				return follower.username
			})

			let followersData = []
			while (filteredFollowers.length > 0) {
				followersData.push(filteredFollowers.splice(0, 100))
			}

			let count = 0

			for (const batch of followersData) {
				count += batch.length
			}

			console.log(`${count} followers found`)

			for (const data of followersData) {
				console.log('data: ', data)

				await axios({
					method: 'post',
					url: `/user-following?following=${tracker.username}`,
					headers: {
						Authorization: process.env.AUTH,
					},
					data: data,
				}).catch(console.warn)

				await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 2))
			}

			console.log('Done!')
		}
	}

	console.log('end')
}

run()
