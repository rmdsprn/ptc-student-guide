package com.ptc.psg

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.EditText
import android.widget.Button
import android.widget.ImageButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.drawerlayout.widget.DrawerLayout
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.navigation.NavigationView
import com.google.firebase.auth.FirebaseAuth
import com.ptc.psg.network.ApiClient
import com.ptc.psg.network.ChatRequest
import com.ptc.psg.network.ChatResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class ChatActivity : AppCompatActivity() {

    // UI
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView
    private lateinit var menuButton: ImageButton
    private lateinit var recyclerView: RecyclerView
    private lateinit var messageInput: EditText
    private lateinit var sendButton: Button

    // Chat
    private lateinit var adapter: ChatAdapter
    private val messages = mutableListOf<ChatMessage>()

    // State
    private var typingIndex = -1
    private var isWaitingForAI = false
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        bindViews()
        setupRecyclerView()
        setupDrawer()
        setupSendButton()
    }

    // 🔗 Bind all views safely
    private fun bindViews() {
        drawerLayout = findViewById(R.id.drawerLayout)
        navigationView = findViewById(R.id.navigationView)
        menuButton = findViewById(R.id.menuButton)
        recyclerView = findViewById(R.id.chatRecycler)
        messageInput = findViewById(R.id.messageInput)
        sendButton = findViewById(R.id.sendButton)
    }

    // 📜 RecyclerView setup
    private fun setupRecyclerView() {
        adapter = ChatAdapter(messages)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    // ☰ Drawer setup
    private fun setupDrawer() {
        menuButton.setOnClickListener {
            drawerLayout.open()
        }

        navigationView.setNavigationItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    Toast.makeText(this, "Home", Toast.LENGTH_SHORT).show()
                }
                R.id.nav_chat -> {
                    // Already on chat
                }
                R.id.nav_contact -> {
                    Toast.makeText(this, "Contact Us", Toast.LENGTH_SHORT).show()
                }
            }
            drawerLayout.close()
            true
        }
    }

    // 📤 Send button logic
    private fun setupSendButton() {
        sendButton.setOnClickListener {
            val userText = messageInput.text.toString().trim()

            if (userText.isEmpty() || isWaitingForAI) return@setOnClickListener

            isWaitingForAI = true
            sendButton.isEnabled = false

            addMessage(ChatMessage(userText, isUser = true))
            messageInput.text.clear()

            showTypingIndicator()
            sendMessageToAI(userText)

            // ⏳ Slow-response hint
            handler.postDelayed({
                if (isWaitingForAI) {
                    Toast.makeText(
                        this,
                        "PTC Guide is still thinking…",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }, 3000)
        }
    }

    // ➕ Add message
    private fun addMessage(message: ChatMessage) {
        messages.add(message)
        adapter.notifyItemInserted(messages.size - 1)
        recyclerView.scrollToPosition(messages.size - 1)
    }

    // 🤖 Typing indicator
    private fun showTypingIndicator() {
        typingIndex = messages.size
        messages.add(
            ChatMessage(
                text = "PTC Guide is typing…",
                isUser = false,
                isTyping = true
            )
        )
        adapter.notifyItemInserted(typingIndex)
        recyclerView.scrollToPosition(typingIndex)
    }

    // ❌ Remove typing indicator
    private fun removeTypingIndicator() {
        if (typingIndex != -1 && typingIndex < messages.size) {
            messages.removeAt(typingIndex)
            adapter.notifyItemRemoved(typingIndex)
            typingIndex = -1
        }

        isWaitingForAI = false
        sendButton.isEnabled = true
    }

    // 🌐 API call
    private fun sendMessageToAI(message: String) {
        val sessionId = FirebaseAuth.getInstance().currentUser?.uid ?: "guest"
        ApiClient.api.sendMessage(ChatRequest(message = message, sessionId = sessionId))
            .enqueue(object : Callback<ChatResponse> {

                override fun onResponse(
                    call: Call<ChatResponse>,
                    response: Response<ChatResponse>
                ) {
                    removeTypingIndicator()

                    if (response.isSuccessful && response.body() != null) {
                        addMessage(
                            ChatMessage(
                                text = response.body()!!.reply,
                                isUser = false
                            )
                        )
                    } else {
                        showError("AI failed to respond")
                    }
                }

                override fun onFailure(call: Call<ChatResponse>, t: Throwable) {
                    removeTypingIndicator()
                    showError("Request timed out. Please try again.")
                }
            })
    }

    // ⚠ Error helper
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
