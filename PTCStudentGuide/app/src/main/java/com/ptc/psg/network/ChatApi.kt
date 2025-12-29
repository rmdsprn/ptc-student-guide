package com.ptc.psg.network

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

// ✅ UPDATED REQUEST
data class ChatRequest(
    val message: String,
    val sessionId: String
)

data class ChatResponse(
    val reply: String
)

interface ChatApi {

    // Cloud Run root URL handles POST directly
    @POST("/")
    fun sendMessage(@Body request: ChatRequest): Call<ChatResponse>
}
