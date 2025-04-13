import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

// iOS style accordion components with custom header
const MobileAccordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Accordion
    ref={ref}
    className={cn("rounded-lg overflow-hidden", className)}
    {...props}
  />
))
MobileAccordion.displayName = "MobileAccordion"

// iOS style accordion item that preserves header styling
const MobileAccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
    headerClassName?: string;
    headerContent?: React.ReactNode;
  }
>(({ className, headerClassName, headerContent, ...props }, ref) => (
  <AccordionItem 
    ref={ref}
    className={cn("border-0", className)} 
    {...props}
  />
))
MobileAccordionItem.displayName = "MobileAccordionItem"

// iOS style accordion trigger with preserved styling
const MobileAccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    icon?: React.ReactNode;
    title: string;
    titleClassName?: string;
  }
>(({ className, icon, title, titleClassName, ...props }, ref) => (
  <AccordionPrimitive.Header className="bg-[#f5f5f7] border-b border-gray-200 text-gray-900">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "p-4 w-full flex justify-between items-center",
        className
      )}
      {...props}
    >
      <div className="flex items-center">
        {icon}
        <h3 className={cn("text-lg font-medium", titleClassName)}>
          {title}
        </h3>
      </div>
      <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
MobileAccordionTrigger.displayName = "MobileAccordionTrigger"

// iOS style accordion content with padding
const MobileAccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("p-6", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
MobileAccordionContent.displayName = "MobileAccordionContent"

export { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent,
  MobileAccordion,
  MobileAccordionItem,
  MobileAccordionTrigger,
  MobileAccordionContent
}
