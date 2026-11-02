package com.tokenworld.exchange.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class ExchangeDashboardActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TokenWorldDashboard(ownerName = "MAURO Lomibao Dar III")
        }
    }
}

@Composable
fun TokenWorldDashboard(ownerName: String) {
    var btcPrice by remember { mutableStateOf("$64,250.00") }
    var ethPrice by remember { mutableStateOf("$3,450.00") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Token World Exchange",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Owner: $ownerName",
            fontSize = 14.sp,
            color = Color(0xFF94A3B8),
            modifier = Modifier.padding(bottom = 24.dp)
        )

        MarketCard(symbol = "BTC/USDT", price = btcPrice, change = "+2.4%")
        Spacer(modifier = Modifier.height(12.dp))
        MarketCard(symbol = "ETH/USDT", price = ethPrice, change = "+1.8%")

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = { /* Execute trade order */ },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text(text = "Place Trade", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun MarketCard(symbol: String, price: String, change: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = symbol, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text(text = "Live Pair", fontSize = 12.sp, color = Color.Gray)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(text = price, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text(text = change, fontSize = 14.sp, color = Color(0xFF22C55E))
            }
        }
    }
}
