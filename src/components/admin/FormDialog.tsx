"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface FormField {
  name: string
  label: string
  type?: "text" | "email" | "password" | "url" | "textarea" | "select"
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: FormField[]
  initialData?: Record<string, string | number | boolean | null>
  onSubmit: (data: Record<string, string | number | boolean | null>) => Promise<void>
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialData,
  onSubmit,
}: FormDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && initialData) {
      const data: Record<string, string> = {}
      fields.forEach((field) => {
        const value = initialData[field.name]
        data[field.name] = value !== undefined && value !== null ? String(value) : ""
      })
      setFormData(data)
    } else if (open) {
      const data: Record<string, string> = {}
      fields.forEach((field) => {
        data[field.name] = ""
      })
      setFormData(data)
    }
  }, [open, initialData, fields])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required={field.required}
                >
                  <option value="">请选择</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中..." : "提交"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
