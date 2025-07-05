import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../../src/components/ui/Button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('button', 'button--primary', 'button--medium')
  })

  it('renders with custom variant and size', () => {
    render(
      <Button variant="secondary" size="large">
        Large Secondary Button
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('button--secondary', 'button--large')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    const handleClick = vi.fn()
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('button--disabled')
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders with custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('renders with correct button type', () => {
    render(<Button type="submit">Submit</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('renders danger variant correctly', () => {
    render(<Button variant="danger">Delete</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('button--danger')
  })

  it('renders small size correctly', () => {
    render(<Button size="small">Small Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('button--small')
  })
})