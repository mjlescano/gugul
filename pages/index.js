import { Component } from 'react'
import ReactDOM from 'react-dom'
import Router from 'next/router'
import debounce from 'lodash.debounce'
import times from 'lodash.times'
import Mousetrap from 'mousetrap'
import jump from 'jump.js'
import search from '../lib/search/client'
import Title from '../components/Title'
import Layout from '../components/Layout'
import Result from '../components/Result'
import SearchInput from '../components/SearchInput'
import LoadingResult from '../components/LoadingResult'

export default class Page extends Component {
  constructor (props) {
    super(props)

    this.state = {
      query: props.url.query && props.url.query.query,
      results: [],
      selected: 0,
      error: null,
      loading: false
    }

    this.lazyLoading = debounce(this.loading, 350)
    this.lazySearch = debounce(this.search, 900)
  }

  componentDidMount () {
    this.handleSubmit(this.state.query)

    Mousetrap.bind('down', this.selectNextResult)
    Mousetrap.bind('up', this.selectPrevResult)
    Mousetrap.bind('enter', this.enterResult)
  }

  // Dont re-render new loading list
  shouldComponentUpdate (nextProps, nextState) {
    const results = this.state.results
    const nextResults = nextState.results

    if (this.state.loading === false) return true
    if (nextState.loading === false) return true
    if (results.length !== 0) return true
    if (!nextResults || nextResults.length === 0) return false

    return true
  }

  handleChange = (query) => {
    this.setState({
      query,
      results: [],
      selected: 0,
      error: null,
      loading: false
    }, () => {
      this.lazyLoading()
      this.lazySearch()
    })

    Router.push({
      pathname: '/',
      query: query ? { query } : null
    })
  }

  handleSubmit = (query) => {
    this.setState({ query }, this.search)
  }

  loading = () => {
    this.setState({
      loading: !!this.state.query
    })
  }

  _search = null
  search = () => {
    const query = this.state.query

    this.setState({ loading: true })

    if (this._search) this._search.abort()

    const _search = this._search = search(query)

    _search.aborted = false

    _search.abort = () => {
      _search.aborted = true
    }

    _search
      .then((results) => {
        if (_search.aborted) return

        this.setState({
          query,
          results,
          selected: 0,
          error: null,
          loading: false
        })
      })
      .catch((err) => {
        if (_search.aborted) return

        let msg = 'Sorry, there was an error.'

        if (err.status === 429) {
          msg = 'Sorry, google forces a limit to private searches, try again in a moment please.'
        }

        this.setState({
          query,
          results: [],
          selected: 0,
          loading: false,
          error: msg
        })
      })
  }

  focusSearch = () => {
    ReactDOM.findDOMNode(this.searchInput).focus()
  }

  selectResult = (selected) => {
    this.setState({ selected }, this.scrollToSelectedResult)
  }

  scrollToSelectedResult = () => {
    const el = document.querySelector('.result.selected')

    if (!el) return

    const rect = el.getBoundingClientRect()
    const h = window.innerHeight || document.documentElement.clientHeight

    const isAfterTop = rect.top >= 0
    const isBeforeBottom = rect.bottom - h <= 0

    // Element is fully visible
    if (isAfterTop && isBeforeBottom) return

    const offset = isAfterTop ? (rect.height + marginBottom(el)) - h : 0

    jump(el, {
      duration: 200,
      offset
    })
  }

  selectNextResult = (evt) => {
    const count = this.state.results.length
    let { selected } = this.state

    if (count === 0) return
    if (++selected >= count) return

    evt.preventDefault()

    this.selectResult(selected)
  }

  selectPrevResult = (evt) => {
    const count = this.state.results.length
    let { selected } = this.state

    if (count === 0) return
    if (--selected < 0) return

    evt.preventDefault()

    this.selectResult(selected)
  }

  enterResult = (evt) => {
    const { results, selected } = this.state
    const result = results[selected]

    window.location = result.href
  }

  render () {
    const {
      query,
      results,
      selected,
      error,
      loading
    } = this.state

    return (
      <Layout>
        <style jsx>{`
          header {
            padding: 2em 0 1em;
          }

          header :global(.search-input) {
            display: block;
            cursor: text;
            margin: 0;
            padding: 0 10px;
            border: 0;
            width: 100%;
            line-height: 1.3;
            font-family: 'Ovo', serif;
            font-size: 1.8em;
            outline: none;
            color: inherit;
            background-color: transparent;
          }

          .search-error {
            margin: 1em 0;
            font-weight: 700;
          }

          .results {
            padding-top: 2em;
          }
        `}</style>
        <Title>{query}</Title>
        <header onClick={this.focusSearch}>
          <div className='container'>
            <SearchInput
              ref={(input) => { this.searchInput = input }}
              className='search-input'
              placeholder='Gugul Search...'
              onChange={this.handleChange}
              onSubmit={this.handleSubmit}
              value={query}
              autoFocus />
          </div>
        </header>
        <main className='container'>
          {error && (
            <div className='search-error'>
              {error}
            </div>
          )}
          <div className='results'>
            {!loading && results.map((result, index) => {
              if (!result.href) return null
              return (
                <Result
                  key={index}
                  selected={selected === index}
                  result={result}
                  onFocus={() => this.selectResult(index)} />
              )
            })}
            {loading && times(10, (i) => <LoadingResult key={i} />)}
          </div>
        </main>
      </Layout>
    )
  }
}

function marginBottom (el) {
  const marginBottom = document.defaultView
    .getComputedStyle(el)
    .getPropertyValue('margin-bottom')

  return parsePixels(marginBottom)
}

function parsePixels (pxs) {
  return Number(pxs.replace('px', ''))
}
