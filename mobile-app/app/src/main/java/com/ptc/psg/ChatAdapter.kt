package com.ptc.psg

import android.graphics.Color
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class ChatAdapter(private val messages: List<ChatMessage>) :
    RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    companion object {
        private const val TYPE_MESSAGE = 0
        private const val TYPE_TYPING = 1
    }

    override fun getItemViewType(position: Int): Int {
        return if (messages[position].isTyping) TYPE_TYPING else TYPE_MESSAGE
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == TYPE_TYPING) {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_typing, parent, false)
            TypingViewHolder(view)
        } else {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_message, parent, false)
            MessageViewHolder(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = messages[position]

        if (holder is MessageViewHolder) {
            holder.bind(message)
        } else if (holder is TypingViewHolder) {
            holder.bind()
        }
    }

    override fun getItemCount() = messages.size

    // 🧑 Normal messages
    inner class MessageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val messageText: TextView = view.findViewById(R.id.messageText)

        fun bind(message: ChatMessage) {
            messageText.text = message.text
            val params = messageText.layoutParams as FrameLayout.LayoutParams

            if (message.isUser) {
                params.gravity = Gravity.END
                messageText.setBackgroundResource(R.drawable.bg_user_message)
                messageText.setTextColor(Color.WHITE)
            } else {
                params.gravity = Gravity.START
                messageText.setBackgroundResource(R.drawable.bg_ai_message)
                messageText.setTextColor(Color.BLACK)
            }

            messageText.layoutParams = params
        }
    }

    // 🤖 Typing indicator
    inner class TypingViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val typingText: TextView = view.findViewById(R.id.typingText)

        fun bind() {
            typingText.text = "Typing…"
        }
    }
}
