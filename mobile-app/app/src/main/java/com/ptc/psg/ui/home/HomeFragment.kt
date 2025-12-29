package com.ptc.psg.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AlphaAnimation
import android.widget.Button
import androidx.fragment.app.Fragment
import com.ptc.psg.MainActivity
import com.ptc.psg.R

class HomeFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {

        val view = inflater.inflate(R.layout.fragment_home, container, false)
        val chatNowButton = view.findViewById<Button>(R.id.btnChatNow)

        // ✅ Chat Now → Navigate using MainActivity
        chatNowButton.setOnClickListener {
            (activity as? MainActivity)?.navigateToChat()
        }

        // ✨ Fade-in animation
        val fadeIn = AlphaAnimation(0f, 1f).apply {
            duration = 600
        }
        view.startAnimation(fadeIn)

        return view
    }
}
