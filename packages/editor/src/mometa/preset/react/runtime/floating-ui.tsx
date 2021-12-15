import React from '@@__mometa-external/react'
import { createPortal } from '@@__mometa-external/react-dom'
import c from 'classnames'
import { getScrollParents } from '@floating-ui/dom'

import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { Modal, Button, Typography } from 'antd'
import { css } from '../../../utils/emotion-css'
import usePersistFn from '@rcp/use.persistfn'
import { api } from '@@__mometa-external/shared'
import { OpType } from '../../../const'
import { MometaHTMLElement, useProxyEvents } from './dom-api'
import MoreButton from './components/more-button'
import { PreventFastClick } from '@rcp/c.preventfastop'
import { openReactStandalone } from '../../../utils/open-react-element'
import { CodeEditor } from '../../../../shared/code-editor'

function useForceUpdate() {
  const [v, setV] = React.useState(1)
  const update = React.useCallback(() => {
    setV((x) => x + 1)
  }, [setV])

  return [v, update]
}

function usePosition(dom: HTMLElement) {
  const [data, setData] = React.useState({ isReady: false, rect: null })
  const [v, update] = useForceUpdate()

  React.useEffect(() => {
    const rect = dom.getBoundingClientRect()
    setData({ rect, isReady: true })
    const parents = getScrollParents(dom)

    const debouncedUpdate: any = update
    parents.forEach((par) => {
      par.addEventListener('resize', debouncedUpdate)
      par.addEventListener('scroll', debouncedUpdate)
    })

    return () => {
      parents.forEach((par) => {
        par.removeEventListener('resize', debouncedUpdate)
        par.removeEventListener('scroll', debouncedUpdate)
      })
    }
  }, [v, dom, update])

  return data
}

let gDiv
const globalGetContainer = () => {
  if (gDiv && gDiv.parentElement) {
    return gDiv
  }
  const div = document.createElement('div')
  Object.assign(div.style, {
    position: 'fixed',
    left: 0,
    top: 0
  })
  document.body.appendChild(div)
  gDiv = div
  return div
}

type FloatingUiProps = JSX.IntrinsicElements['div'] & {
  getContainer?: () => HTMLElement
  dom: MometaHTMLElement
  leftTopElement?: React.ReactNode
  rightTopElement?: React.ReactNode
  centerTopElement?: React.ReactNode
  centerBottomElement?: React.ReactNode
}

export function FloatingUi({
  centerBottomElement,
  centerTopElement,
  rightTopElement,
  leftTopElement,
  dom,
  getContainer = globalGetContainer,
  onClick,
  ...props
}: FloatingUiProps) {
  const { isReady, rect } = usePosition(dom)
  const events = React.useMemo(() => ({ onClick }), [onClick])
  useProxyEvents(dom, events)

  return (
    !!isReady &&
    createPortal(
      <div
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height
        }}
        {...props}
      >
        {!!leftTopElement && (
          <div
            className={css`
              display: flex;
              transform: translateY(-100%);
              position: absolute;
              top: 0px;
              left: -1px;
            `}
          >
            {leftTopElement}
          </div>
        )}
        {!!rightTopElement && (
          <div
            className={css`
              display: flex;
              transform: translateY(-100%);
              position: absolute;
              top: 0px;
              right: -1px;
            `}
          >
            {rightTopElement}
          </div>
        )}
        {!!centerTopElement && (
          <div
            className={css`
              display: flex;
              transform: translateY(-100%, -50%);
              position: absolute;
              top: 1px;
              left: 50%;
            `}
          >
            {centerTopElement}
          </div>
        )}
        {!!centerBottomElement && (
          <div
            className={css`
              display: flex;
              transform: translateY(-100%, -50%);
              position: absolute;
              bottom: 1px;
              left: 50%;
            `}
          >
            {centerBottomElement}
          </div>
        )}
      </div>,
      getContainer()
    )
  )
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type OveringFloatProps = FloatingUiProps & {
  isSelected?: boolean
  onSelect?: () => void
  onDeselect?: () => void
}

export function OveringFloat({ isSelected, onDeselect, onSelect, dom, getContainer, ...props }: OveringFloatProps) {
  React.useEffect(() => {
    dom.__mometa.preventEvent = false
    return () => {
      if (dom?.__mometa) {
        dom.__mometa.preventEvent = true
      }
    }
  }, [dom])

  const data = dom.__mometa?.getMometaData()

  const onClickFn = usePersistFn(() => {
    // eslint-disable-next-line no-unused-expressions
    onSelect?.()
  })

  const color = isSelected ? '#5185EC' : '#6F97E7'

  const commonCss = css`
    display: block;
    color: #fff;
    background-color: ${color};
    padding: 0px 3px;
    font-size: 12px;
    pointer-events: auto;
  `
  const btnCss = css`
    display: inline-flex;
    cursor: pointer;
    margin-left: 2px;
    margin-right: 2px;
  `

  const opHandler = usePersistFn(async (opType: string) => {
    return api.handleViewOp(opType, dom)
  })

  if (!dom || !data) {
    return null
  }

  return (
    <FloatingUi
      leftTopElement={
        <div className={c(commonCss)} title={data.text}>
          {data.name || 'Unknown'}
          {!!data.container && '*'}
        </div>
      }
      rightTopElement={
        isSelected && (
          <div className={c(commonCss)}>
            <PreventFastClick onClick={() => opHandler('info')}>
              <InfoCircleOutlined className={c(btnCss)} />
            </PreventFastClick>
            <PreventFastClick onClick={() => opHandler('up')}>
              <ArrowUpOutlined className={c(btnCss)} />
            </PreventFastClick>
            <PreventFastClick onClick={() => opHandler('down')}>
              <ArrowDownOutlined className={c(btnCss)} />
            </PreventFastClick>
            <PreventFastClick onClick={() => opHandler('del')}>
              <DeleteOutlined className={c(btnCss)} />
            </PreventFastClick>
            <MoreButton className={btnCss} dom={dom} />
          </div>
        )
      }
      dom={dom}
      getContainer={getContainer}
      className={css`
        pointer-events: none;
        outline: ${isSelected ? '1px solid ' + color : '1px dashed ' + color};
      `}
      onClick={onClickFn}
    />
  )
}