import { useEffect, useRef, useState } from "react"
import { v1 as uuid } from "uuid"
import "./stylesheets/subreddit.css"

const getReddit = name => {
  return fetch(`https://www.reddit.com/r/${name}.json`)
    .then(response => {
      if (response.status === 404) {
        throw new Error("endpoint doesn't exist")
      }
      return response.json()
    })
    .then(body => {
      const subReddit = {
        posts: body.data.children,
        name,
        id: uuid(),
      }
      subReddit.posts = subReddit.posts.map(post => {
        return {
          ...post.data,
        }
      })
      return subReddit
    })
    .catch(error => {
      throw new Error(error)
    })
}

const App = () => {
  const [subReddits, setSubReddits] = useState([])
  const subRedditsContainerRef = useRef(null)
  const [notification, setNotification] = useState(null)
  useEffect(() => {
    let ignore = false
    ;(async () => {
      const data = localStorage.getItem("subReddits")
      if (!data) {
        return
      }
      const names = JSON.parse(data)
      names.forEach(async name => {
        return await getReddit(name).then(subReddit => {
          setSubReddits(prev => {
            if (ignore) return prev
            return prev.concat(subReddit)
          })
        })
      })
    })()
    return () => {
      ignore = true
      setSubReddits([])
    }
  }, [])
  const saveNames = subReddits => {
    const names = subReddits.map(subReddit => {
      return subReddit.name
    })
    localStorage.setItem("subReddits", JSON.stringify(names))
  }
  const refresh = async id => {
    let newSubReddits = subReddits.map(async subreddit => {
      if (subreddit.id === id) {
        const newReddit = await getReddit(subreddit.name)
        newReddit.id = id
        return newReddit
      }
      return subreddit
    })
    newSubReddits = await Promise.all(newSubReddits)
    setSubReddits(newSubReddits)
  }
  const remove = id => {
    const newSubReddits = subReddits.filter(subreddit => subreddit.id !== id)
    saveNames(newSubReddits)
    setSubReddits(newSubReddits)
  }
  const setMessage = (type, message) => {
    setNotification({
      type,
      message,
      hidden: false,
    })
    setTimeout(() => {
      setNotification({
        message,
        type,
        hidden: true,
      })
    }, 2000)
  }
  const add = async name => {
    if (name === "") return
    try {
      const newReddit = await getReddit(name)
      const newSubReddits = subReddits.concat(newReddit)
      saveNames(newSubReddits)
      setSubReddits(newSubReddits)
      setMessage("success", `sucessfully added r/${name}`)
    } catch (err) {
      setMessage("error", "no such subreddit")
    }
  }
  const updateCurrent = inc => {
    return () => {
      const child = subRedditsContainerRef.current.querySelector(".subreddit")
      const size = child.getBoundingClientRect()
      subRedditsContainerRef.current.scrollBy({
        left: size.width * inc,
        top: 0,
        behavior: "smooth",
      })
    }
  }
  return (
    <main>
      <Notification notification={notification} />
      <AddForm add={add} />
      <SubReddits
        subReddits={subReddits}
        refresh={refresh}
        remove={remove}
        ref={subRedditsContainerRef}
      />
      <nav className="subreddit-nav">
        <button onClick={updateCurrent(-1)}>{"<"}</button>
        <button onClick={updateCurrent(1)}>{">"}</button>
      </nav>
    </main>
  )
}
const Notification = ({ notification }) => {
  if (!notification) {
    return <div className="notification hidden"></div>
  }
  return (
    <div
      className={
        "notification " +
        (notification.hidden ? "hidden " : "") +
        notification.type
      }
    >
      {notification.message}
    </div>
  )
}
const AddForm = ({ add }) => {
  const [name, setName] = useState("")
  const handleAdd = e => {
    e.preventDefault()
    add(name)
    setName("")
  }
  return (
    <div className="add-form">
      <form onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="example: movies"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
const SubReddits = ({ subReddits, refresh, remove, ref }) => {
  if (subReddits.length === 0) {
    return (
      <div className="subreddits empty">
        <div>Try adding a subreddit above</div>
      </div>
    )
  }
  return (
    <div className="subreddits" ref={ref}>
      {subReddits.map(subReddit => {
        return (
          <SubReddit
            subReddit={subReddit}
            key={subReddit.id}
            refresh={refresh}
            remove={remove}
          />
        )
      })}
    </div>
  )
}
const SubReddit = ({ subReddit, refresh, remove, ref }) => {
  const handleRefresh = () => {
    refresh(subReddit.id)
  }
  const handleRemove = () => {
    remove(subReddit.id)
  }
  return (
    <div className="subreddit" ref={ref}>
      <header>
        <h2>
          <a href={`https://reddit.com/r/${subReddit.name}`}>
            r/{subReddit.name}
          </a>
        </h2>
        <button onClick={handleRefresh}>Refresh</button>
        <button onClick={handleRemove}>Delete</button>
      </header>
      <ul>
        {subReddit.posts.map(post => {
          return (
            <li key={post.id}>
              <Post post={post} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
const Post = ({ post }) => {
  const shortenNumber = num => {
    if (num < 1000) return num
    return `${(num / 1000).toFixed(1)}k`
  }
  return (
    <div className="post">
      <span className="ups">{shortenNumber(post.ups)}</span>
      <span className="title" title={post.title}>
        <a href={post.url}>{post.title}</a>
      </span>
    </div>
  )
}

export default App
