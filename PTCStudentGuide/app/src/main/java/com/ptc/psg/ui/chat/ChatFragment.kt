package com.ptc.psg.ui.chat

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.ImageButton
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.auth.FirebaseAuth
import com.ptc.psg.ChatAdapter
import com.ptc.psg.ChatMessage
import com.ptc.psg.R
import com.ptc.psg.network.ApiClient
import com.ptc.psg.network.ChatRequest
import com.ptc.psg.network.ChatResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class ChatFragment : Fragment() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var messageInput: EditText
    private lateinit var sendButton: ImageButton

    private lateinit var adapter: ChatAdapter
    private val messages = mutableListOf<ChatMessage>()

    private var isWaitingForAI = false
    private val handler = Handler(Looper.getMainLooper())

    // ✅ Use Firebase UID as sessionId
    private val sessionId: String by lazy {
        FirebaseAuth.getInstance().currentUser?.uid ?: "guest"
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {

        val view = inflater.inflate(R.layout.fragment_chat, container, false)

        recyclerView = view.findViewById(R.id.chatRecycler)
        messageInput = view.findViewById(R.id.messageInput)
        sendButton = view.findViewById(R.id.sendButton)

        adapter = ChatAdapter(messages)
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter

        sendButton.setOnClickListener {
            val userText = messageInput.text.toString().trim()
            if (userText.isEmpty() || isWaitingForAI) return@setOnClickListener

            isWaitingForAI = true
            sendButton.isEnabled = false

            addMessage(ChatMessage(userText, isUser = true))
            messageInput.text.clear()

            // Typing indicator
            addMessage(ChatMessage("Typing…", isUser = false))

            sendMessageToAI(userText)

            handler.postDelayed({
                if (isWaitingForAI && context != null) {
                    Toast.makeText(
                        requireContext(),
                        "PTC Guide is still thinking…",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }, 3000)
        }

        return view
    }

    private fun addMessage(message: ChatMessage) {
        messages.add(message)
        adapter.notifyItemInserted(messages.lastIndex)
        recyclerView.scrollToPosition(messages.lastIndex)
    }

    private fun removeTypingIndicator() {
        if (messages.isNotEmpty() && messages.last().text == "Typing…") {
            val index = messages.lastIndex
            messages.removeAt(index)
            adapter.notifyItemRemoved(index)
        }
    }

    private fun sendMessageToAI(message: String) {

        ApiClient.api.sendMessage(
            ChatRequest(
                message = message,
                sessionId = sessionId
            )
        ).enqueue(object : Callback<ChatResponse> {

            override fun onResponse(
                call: Call<ChatResponse>,
                response: Response<ChatResponse>
            ) {
                isWaitingForAI = false
                sendButton.isEnabled = true
                removeTypingIndicator()

                if (response.isSuccessful && response.body() != null) {
                    addMessage(
                        ChatMessage(
                            text = response.body()!!.reply,
                            isUser = false
                        )
                    )
                } else {
                    showError("PTC Guide failed to respond")
                }
            }

            override fun onFailure(call: Call<ChatResponse>, t: Throwable) {
                isWaitingForAI = false
                sendButton.isEnabled = true
                removeTypingIndicator()
                showError("Network error. Please try again.")
            }
        })
    }

    private fun showError(message: String) {
        if (context != null) {
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        }
    }
}
