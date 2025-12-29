package com.ptc.psg

data class ChatMessage(
    val text: String,
    val isUser: Boolean,
    val isTyping: Boolean = false
)
