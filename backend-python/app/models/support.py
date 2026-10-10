"""Help Center / support models — Sprint 2.11.

Covers FAQs, FAQ categories, support tickets and the ticket conversation
thread. The message models are deliberately transport agnostic so the same
documents can be pushed over a websocket in a later sprint without a schema
change.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

TicketCategory = Literal[
    "order",
    "payment",
    "refund",
    "partner-complaint",
    "general",
    "wash-quality",
    "missing-garment",
    "delay",
]

TicketPriority = Literal["low", "medium", "high", "urgent"]

TicketStatus = Literal["open", "in-progress", "awaiting-customer", "resolved", "closed"]

MessageAuthor = Literal["customer", "support", "system"]


class FaqCategory(BaseModel):
    id: str
    name: str
    description: str = ""
    icon: str = "life-buoy"
    order: int = 0
    faqCount: int = 0


class Faq(BaseModel):
    id: str
    categoryId: str = "general"
    categoryName: str = ""
    question: str
    answer: str
    tags: List[str] = Field(default_factory=list)
    order: int = 0
    helpfulCount: int = 0


class FaqListResponse(BaseModel):
    items: List[Faq] = Field(default_factory=list)
    total: int = 0
    categories: List[FaqCategory] = Field(default_factory=list)


class FaqCategoriesResponse(BaseModel):
    items: List[FaqCategory] = Field(default_factory=list)
    total: int = 0


class TicketMessage(BaseModel):
    id: str
    ticketId: str
    author: MessageAuthor = "customer"
    authorName: str = ""
    body: str = ""
    attachmentName: Optional[str] = None
    attachmentUrl: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    createdAt: str


class SupportTicket(BaseModel):
    id: str
    ticketNumber: str
    category: TicketCategory = "general"
    categoryLabel: str = "General Issue"
    subject: str = ""
    description: str = ""
    priority: TicketPriority = "medium"
    status: TicketStatus = "open"
    orderId: Optional[str] = None
    orderNumber: Optional[str] = None
    attachmentName: Optional[str] = None
    attachmentUrl: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    messageCount: int = 0
    unreadCount: int = 0
    lastMessageAt: Optional[str] = None
    createdAt: str
    updatedAt: Optional[str] = None
    messages: List[TicketMessage] = Field(default_factory=list)


class TicketListResponse(BaseModel):
    items: List[SupportTicket] = Field(default_factory=list)
    total: int = 0
    openCount: int = 0
    resolvedCount: int = 0


class CreateTicketPayload(BaseModel):
    category: TicketCategory = "general"
    subject: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=2000)
    priority: TicketPriority = "medium"
    orderId: Optional[str] = Field(default=None, max_length=64)
    attachmentName: Optional[str] = Field(default=None, max_length=160)
    attachmentUrl: Optional[str] = Field(default=None, max_length=1000)
    photos: List[str] = Field(default_factory=list)


class TicketReplyPayload(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    attachmentName: Optional[str] = Field(default=None, max_length=160)
    attachmentUrl: Optional[str] = Field(default=None, max_length=1000)
    photos: List[str] = Field(default_factory=list)


class TicketResponse(BaseModel):
    ok: bool = True
    message: str = ""
    ticket: SupportTicket
