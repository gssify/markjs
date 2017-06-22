import 'svg.js'

const LINE_COLOR = '#000'
const MAIN_COLOR = '#333'
const ACTION_ADD = 'add'
const ACTION_RESIZE = 'resize'
const ACTION_DELETE = 'delete'

class Mark {
  constructor (options) {
    if (!options.id) throw Error('no options.id')
    if (!options.url) throw Error('no options.url')
    if (typeof options.beforeAdd !== 'function') throw Error('no options.beforeAdd')
    if (typeof options.beforeDelete !== 'function') throw Error('no options.beforeDelete')
    if (!options.marks instanceof Array) options.marks = []

    this.beforeAdd = options.beforeAdd
    this.beforeDelete = options.beforeDelete
    this.dataFormat = options.dataFormat || function () {}
    this.afterAdded = options.afterAdded
    this.marks = options.marks
    this.url = options.url
    this.id = options.id
    this.el = document.querySelector(`#${options.id}`)
    this._resize = false
    this._action = 'add'
    this._moving = false
    this.domInit()
  }

  domInit () {
    const img = new Image()
    img.src = this.url

    img.onload = (function () {
      this.el.appendChild(img)
      this.el.style.width = `${img.width}px`
      this.el.style.height = `${img.height}px`
      this.el.style.position = 'relative'
      this._width = img.width
      this._height = img.height
      this.img = img
      this.draw = SVG(this.id).size(img.width, img.height)
      this.draw.node.style.position = 'absolute'
      this.draw.node.style.left = 0
      this.draw.node.style.top = 0

      img.style.userSelect = 'none'
      this.draw.node.ondragstart = img.ondragstart = function (evt) {
        evt.preventDefault()
        return false
      }

      this.marksInit()
      this.eventInit()
      this.cursorInit()
    }).bind(this)
  }

  cursorInit () {
    this._cursors = [1, 2, 3, 4].map(item => {
      const cursor = this.draw.rect(10, 10)
      cursor
        .data('action', ACTION_RESIZE)
        .fill({color: MAIN_COLOR, opacity: 0.5})
        .style('cursor', 'pointer')
        .hide()
      return cursor
    })
  }

  marksInit () {
    this.marks.map(mark => {
      const polygon = this.paintPolygon(mark.points, ACTION_DELETE)
      polygon.data('data', mark.data)

      mark.__instance = polygon
      mark = Object.assign(mark, this.dataFormat(mark))
      if (mark.text) {
        mark.__text = this.paintText(mark.text, mark.points)
      }

      return mark
    })
  }

  eventInit () {
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
    this.onKeydown = this.onKeydown.bind(this)
    this.onDblClick = this.onDblClick.bind(this)
    this.draw.on('dblclick', this.onDblClick)
    this.draw.on('mousedown', this.onMouseDown)
    document.addEventListener('keydown', this.onKeydown, false)
  }

  paintPolygon (points, action) {
    const polygon = this.draw.polygon(points)
    polygon
      .data('action', action)
      .stroke(MAIN_COLOR)
      .fill({color: MAIN_COLOR, opacity: 0.1})
      .attr('stroke-dasharray', '2')
    return polygon
  }

  paintText (text, points) {
    if (!points instanceof Array) return
    const point = getCentroid(points)
    const svgText = this.draw.text(text)
    const textRect = this.draw.rect(0, 0)

    svgText
      .back()
      .fill({
        color: '#fff',
        opacity: 0.8
      })
      .style('user-select:none')
      .font({
        family: '宋体',
        size: 12
      })

    const {w, h} = svgText.bbox()
    const OFFSET = 8
    svgText.move(point[0] - w / 2, point[1] - h / 2)

    textRect
      .back()
      .move(svgText.x() - OFFSET / 2, svgText.y() - OFFSET / 2)
      .size(w + OFFSET, h + OFFSET)
      .fill({
        color: MAIN_COLOR,
        opacity: 0.4
      })

    svgText.__background = textRect
    return svgText
  }

  addMark () {
    // create a rect element
    this._polygon = this.paintPolygon([[0, 0], [0, 0], [0, 0], [0, 0]], ACTION_DELETE)
    this._polygon.fill({color: MAIN_COLOR, opacity: 0.2})
    return this._polygon
  }

  deleteMark (instance) {
    const removeMark = function () {
      this.marks = this.marks.filter(mark => {
        if (mark.__instance === instance) {
          mark.__instance.remove()
          if (mark.__text) {
            mark.__text.__background.remove()
            mark.__text.remove()
          }
          return false
        }
        return true
      })
    }.bind(this)

    if (this._resize) {
      if (instance === this._polygon) {
        instance.remove()
        this.reset()
      }
    } else {
      this.beforeDelete(result => {
        if (result) removeMark()
      })
    }
  }

  updateMark (evt) {
    this._polygon.x(this._disX < 0 ? this._startLeft + this._disX : this._startLeft)
    this._polygon.y(this._disY < 0 ? this._startTop + this._disY : this._startTop)
    this._polygon.plot(this.getRectPoints())
  }

  resizeMark () {
    // refresh polygon and cursor
    const cursor = this._cursors.find(cursor => cursor === this._handle)
    const index = this._cursors.findIndex(cursor => cursor === this._handle)
    let points = this._points.slice(0).map(point => [point[0], point[1]])

    cursor.move(points[index][0] - 5 + this._disX, points[index][1] - 5 + this._disY)
    points[index][0] = points[index][0] + this._disX
    points[index][1] = points[index][1] + this._disY

    this._polygon.plot(points)
  }

  onDblClick (evt) {
    const instance = evt.target.instance
    if (instance.data('action') === ACTION_DELETE) {
      this.deleteMark(instance)
    }
  }

  onKeydown (evt) {
    if (!this._resize) return
    if (evt.keyCode === 83 && evt.ctrlKey) {
      evt.preventDefault()
      this.beforeAdd((status, data) => {
        if (!status) return

        let mark = {
          data,
          points: this._polygon.array().value,
          __instance: this._polygon
        }

        Object.assign(mark, this.dataFormat(mark))

        if (mark.text) {
          mark.__text = this.paintText(mark.text, mark.points)
        }

        this._polygon.data('data', data)
        this.marks.push(mark)

        this.reset()
      })
    }
  }

  onMouseDown (evt) {
    const svgRect = this.el.getBoundingClientRect()

    // get action with svg instance data
    this._handle = evt.target.instance
    this._action = this._handle.data('action') || ACTION_ADD
    if (this._action === ACTION_DELETE) return
    if (this._action !== ACTION_RESIZE && this._resize) return

    // get drag start point
    this._startX = evt.clientX
    this._startY = evt.clientY
    this._startLeft = this._startX - svgRect.left
    this._startTop = this._startY - svgRect.top

    // emit mousedown hook
    this.onMouseDownHook()

    this._moving = false

    // bind drag relative events
    window.addEventListener('mouseup', this.onMouseUp, false)
    window.addEventListener('mousemove', this.onMouseMove, false)
  }

  onMouseDownHook () {
    if (this._action === ACTION_ADD) {
      this.addMark()
    }

    if (this._action === ACTION_RESIZE) {
      this._points = this._polygon.array().value
    }
  }

  onMouseMove (evt) {
    // get distance between current position with start position
    this._moving = true
    this._disX = evt.clientX - this._startX
    this._disY = evt.clientY - this._startY

    // restrict x direction
    if (this._disX >= 0) {
      if (this._width - this._startLeft < this._disX) {
        this._disX = this._width - this._startLeft
      }
    } else {
      if (this._disX + this._startLeft < 0) {
        this._disX = -this._startLeft
      }
    }

    // restrict y direction
    if (this._disY >= 0) {
      if (this._height - this._startTop < this._disY) {
        this._disY = this._height - this._startTop
      }
    } else {
      if (this._disY + this._startTop < 0) {
        this._disY = -this._startTop
      }
    }

    this.onMouseMoveHook()
  }

  onMouseMoveHook () {
    if (this._action === ACTION_RESIZE) {
      this.resizeMark()
    }

    if (this._action === ACTION_ADD) {
      this.updateMark()
    }
  }

  onMouseUp (evt) {
    this.onMouseUpHook()
    // remove all drag events
    window.removeEventListener('mousemove', this.onMouseMove, false)
    window.removeEventListener('mouseup', this.onMouseUp, false)
  }

  onMouseUpHook () {
    if (this._action === ACTION_RESIZE) {
      if (!this._moving) return
    }
    if (this._action === ACTION_ADD) {
      // avoid mistake mouse click
      if (!this._moving || Math.abs(this._disX) < 10 || Math.abs(this._disY) < 10) {
        this.reset()
        return this._polygon.remove()
      }

      let points = this.getRectPoints()
      points.forEach((point, index) => {
        this._cursors[index].move(point[0] - 5, point[1] - 5).front().show()
      })
      this._resize = true
    }

    this._moving = false
  }

  getRectPoints () {
    // get four end point
    let points = [
      [this._startLeft, this._startTop],
      [this._startLeft + this._disX, this._startTop],
      [this._startLeft + this._disX, this._startTop + this._disY],
      [this._startLeft, this._startTop + this._disY]
    ]
    return points
  }

  getMarks () {
    return this.marks
  }

  reset () {
    this._startX = 0
    this._startY = 0
    this._disX = 0
    this._disY = 0
    this._startLeft = 0
    this._startTop = 0
    this._action = 'add'
    this._handle = null
    this._moving = false
    this._resize = false
    this._polygon.fill({opacity: 0.05})
    this._cursors.forEach(cursor => cursor.hide())
  }

  destroy () {
    this.draw.off('dblclick', this.onDblClick)
    this.draw.off('mousedown', this.onMouseDown)
    this.marks = null
    this._cursors = null
    this.draw.remove()
    this.el.removeChild(this.img)
    document.removeEventListener('keydown', this.onKeydown, false)
    this.img = null
    this.el = null
    this.draw = null
  }
}

module.exports = Mark

function getCentroid(points) {
  let totalArea = 0
  let totalX = 0
  let totalY = 0
  for (let i = 0, l = points.length; i < l; i++) {
    let a = points[(l-i)%l]
    let b = points[l-1-i]
    let area = 0.5 * (a[0] * b[1] - b[0] * a[1])
    let x = (a[0] + b[0]) / 3
    let y = (a[1] + b[1]) / 3
    totalArea += area
    totalX += area * x
    totalY += area * y
  }
  return [totalX / totalArea, totalY/ totalArea]
}
